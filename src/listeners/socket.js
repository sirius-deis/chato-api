const { Server } = require('socket.io');
const auth = require('./auth');
const Message = require('../models/message.models');
const Chat = require('../models/chat.models');
const MessageReaction = require('../models/messageReaction.models');
const GroupBlockList = require('../models/groupBlockList');
const { sequelize, Sequelize } = require('../db/db.config');
const {
  isUserIdsTheSame,
  getReceiverIfExists,
  isUserBlocked,
  findConversationId,
  checkIfConversationWasDeletedAndRestoreIfYes,
  createChat,
} = require('../utils/conversation');
const { isUserBlockedByAnotherUser } = require('../utils/user');
const {
  findOneDeletedMessage,
  createMessage,
  addAttachments,
  filterDeletedMessages,
  findOneMessage,
} = require('../utils/message');

const listOfUsers = new Map();

const createNewConversation = async (user, receiverId) => {
  if (isUserIdsTheSame(user.dataValues.id.toString(), receiverId)) {
    return false;
  }

  const receiver = await getReceiverIfExists(receiverId);
  if (!receiver) {
    return false;
  }

  if (await isUserBlocked(user.dataValues.id.toString(), receiver)) {
    return false;
  }

  const conversationId = await findConversationId(user, receiver);

  if (conversationId) {
    if (await checkIfConversationWasDeletedAndRestoreIfYes(user.dataValues.id, conversationId)) {
      return true;
    }
    return false;
  }

  return await createChat(user.dataValues.id, receiver.dataValues.id);
};

const getParticipantsId = (participants, senderId) => {
  const arr = [];

  participants.forEach((participant) => {
    if (listOfUsers.has(participant.dataValues.id) && participant.dataValues.id !== senderId) {
      arr.push(listOfUsers.get(participant.dataValues.id));
    }
  });

  return arr;
};

module.exports = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      allowedHeaders: [],
      credentials: true,
    },
  });

  io.use(auth);

  io.on('connection', (socket) => {
    const { user } = socket;
    listOfUsers.set(user.dataValues.id, socket.id);
    socket.broadcast.emit('online', user.id);

    socket.on(
      'send_message',
      async ({ message, isNew, chatId, receiverId, repliedMessageId, files }) => {
        let conversation;
        if (isNew) {
          conversation = createNewConversation(user, receiverId);
        } else {
          conversation = await Chat.findByPk(chatId);
          if (!conversation) {
            return socket.emit('error_send_message', {
              message: 'Selected conversation does not exists',
            });
          }
        }

        const participants = await conversation.getUsers();
        if (!participants.find((participant) => participant.dataValues.id === user.dataValues.id)) {
          return socket.emit('error_send_message', {
            message: 'There is no conversation with such id for this user',
          });
        }
        if (conversation.dataValues.type === 'private') {
          const receiver = participants.find(
            (participant) => participant.dataValues.id !== user.dataValues.id,
          );

          if (!receiverId) {
            receiverId = receiver.dataValues.id;
          }

          if (await isUserBlockedByAnotherUser(user.dataValues.id, receiver)) {
            return socket.emit('error_send_message', {
              message: 'You were blocked by selected user',
            });
          }
        } else {
          const groupBlockList = await GroupBlockList.findOne({
            where: Sequelize.and({ userId: user.dataValues.id }, { chatId }),
          });
          if (groupBlockList) {
            return socket.emit('error_send_message', {
              message: 'You were blocked in this group',
            });
          }
        }

        if (repliedMessageId) {
          const repliedMessage = await Message.findByPk(repliedMessageId);

          if (!repliedMessage) {
            return socket.emit('error_send_message', {
              message: 'There is no message to reply with such id',
            });
          }

          const deletedMessageToReply = findOneDeletedMessage(user.dataValues.id, repliedMessageId);
          if (deletedMessageToReply) {
            return socket.emit('error_send_message', {
              message: 'There is no message to reply with such id',
            });
          }
        }

        const createdMessage = await createMessage(
          chatId,
          user.dataValues.id,
          message,
          repliedMessageId,
          files,
        );

        const receiversId = getParticipantsId(participants, user.dataValues.id);

        if (receiversId.length < 1) {
          return;
        }

        io.sockets
          .to([socket.id, ...receiversId])
          .emit('send_message', { chatId, message: createdMessage });
      },
    );

    socket.on('edit_message', async ({ message, chatId, messageId, files }) => {
      const foundMessage = await findOneMessage(messageId, chatId, {
        senderId: user.dataValues.id,
      });

      if (!foundMessage) {
        return socket.emit('error_edit_message', {
          message: 'There is no such message that you can edit',
        });
      }

      const messagesWithoutDeleted = await filterDeletedMessages(user.dataValues.id, foundMessage);

      if (!messagesWithoutDeleted[0]) {
        return socket.emit('error_edit_message', {
          message: 'There is no message with such id',
        });
      }

      foundMessage.message = message;
      foundMessage.isEdited = true;

      await addAttachments(foundMessage, files);

      const participants = await (await foundMessage.getChat()).getUsers();

      const receiversId = getParticipantsId(participants, user.dataValues.id);

      if (receiversId.length < 1) {
        return;
      }
      io.to([...receiversId, socket.id]).emit('edit_message', {
        chatId,
        messageId,
        message: foundMessage,
      });
    });

    socket.on('unsend_message', async ({ chatId, messageId, receiverId }) => {
      const foundMessage = await findOneMessage(messageId, chatId, {
        senderId: user.dataValues.id,
      });
      if (!foundMessage || foundMessage.dataValues.isRead) {
        return socket.emit('error_unsend_message', {
          message: 'There is no such message that you can unsend',
        });
      }

      await sequelize.transaction(async () => {
        await foundMessage.removeAttachments();
        await foundMessage.destroy();
      });

      io.to([receiverId, socket.id]).emit('unsend_message', {
        chatId,
        messageId,
      });
    });

    socket.on('rate_message', async ({ chatId, messageId, reaction }) => {
      const foundMessage = await findOneMessage(messageId, chatId, {
        senderId: user.dataValues.id,
      });

      if (!foundMessage) {
        return socket.emit('error_rate_message', {
          message: 'There is no such message to react to',
        });
      }

      const messageReaction = await MessageReaction.findOne({
        where: {
          userId: user.dataValues.id,
          messageId,
        },
      });

      if (messageReaction) {
        if (messageReaction.dataValues.reaction === reaction) {
          await messageReaction.destroy();
        } else {
          messageReaction.reaction = reaction;
        }
      } else {
        await MessageReaction.create({
          userId: user.dataValues.id,
          messageId,
          reaction,
        });
      }

      const chat = await Chat.findByPk(chatId);
      if (!chat) {
        return socket.emit('error_rate_message', {
          message: 'Selected conversation does not exists',
        });
      }

      const participants = await chat.getUsers();

      const receiversId = getParticipantsId(participants, user.dataValues.id);

      if (receiversId.length < 1) {
        return;
      }

      io.to([...receiversId, socket.id]).emit('rate_message', { messageReaction });
    });

    socket.on('disconnect', () => {
      socket.broadcast.emit('offline', user.id);
      listOfUsers.delete(user.dataValues.id);
    });

    socket.on('connect_error', (err) => {
      console.log(`connect_error due to ${err.message}`);
    });
  });
};
