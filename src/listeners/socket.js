const { Server } = require('socket.io');
const auth = require('./auth');
const Message = require('../models/message.models');
const Conversation = require('../models/conversation.models');
const {
  isUserIdsTheSame,
  getReceiverIfExists,
  isUserBlocked,
  findConversationId,
  checkIfConversationWasDeletedAndRestoreIfYes,
  createConversation,
} = require('../utils/conversation');
const { isUserBlockedByAnotherUser } = require('../utils/user');
const { findOneMessage, createMessage } = require('../utils/message');

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

  return await createConversation(user.dataValues.id, receiver.dataValues.id);
};

const listOfUsers = new Map();

module.exports = (server) => {
  const io = new Server(server);

  io.use(auth);

  io.on('connection', (socket) => {
    const { user } = socket;
    listOfUsers.set(user.dataValues.id, socket.id);
    socket.broadcast.emit('online', user.id);

    socket.on(
      'send_message',
      async ({ messageTest, isNew, conversationId, receiverId, repliedMessageId, files }) => {
        let conversation;
        if (isNew) {
          conversation = createNewConversation(user, receiverId);
        } else {
          conversation = await Conversation.findByPk(conversationId);
          if (!conversation) {
            return socket.emit('error_response', {
              message: 'Selected conversation does not exists',
            });
          }
        }

        const participants = await conversation.getUsers();
        if (!participants.find((participant) => participant.dataValues.id === user.dataValues.id)) {
          return socket.emit('error_response', {
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
            return socket.emit('error_response', {
              message: 'You were blocked by selected user',
            });
          }
        } else {
          //TODO: add a block list for group chats
        }

        if (repliedMessageId) {
          const repliedMessage = await Message.findByPk(repliedMessageId);

          if (!repliedMessage) {
            return socket.emit('error_response', {
              message: 'There is no message to reply with such id',
            });
          }

          const deletedMessageToReply = findOneMessage(user.dataValues.id, repliedMessageId);
          if (deletedMessageToReply) {
            return socket.emit('error_response', {
              message: 'There is no message to reply with such id',
            });
          }
        }

        const createdMessage = await createMessage(
          conversationId,
          user.dataValues.id,
          messageTest,
          repliedMessageId,
          files,
        );

        const receiverSocket = listOfUsers.get(receiverId);
        if (!receiverSocket) {
          return;
        }

        io.to(receiverSocket).emit('receive_message', { message: createdMessage });
      },
    );

    socket.on('unsend_message', () => {});

    socket.on('disconnect', () => {
      socket.broadcast.emit('offline', listOfUsers.get(user.dataValues.id));
      listOfUsers.delete(user.dataValues.id);
    });

    socket.on('connect_error', (err) => {
      console.log(`connect_error due to ${err.message}`);
    });
  });
};
