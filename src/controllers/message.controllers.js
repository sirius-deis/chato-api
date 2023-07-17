const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { Sequelize, sequelize } = require('../db/db.config');
const Message = require('../models/message.models');
const DeletedMessage = require('../models/deletedMessage.models');
const MessageReaction = require('../models/messageReaction.models');
const Attachment = require('../models/attachment.models');
const Conversation = require('../models/conversation.models');
const { findConversation } = require('../utils/conversation');
const {
  createMessage,
  findOneDeletedMessage,
  addAttachments,
  filterDeletedMessages,
  findOneMessage,
} = require('../utils/message');
const { isUserBlockedByAnotherUser } = require('../utils/user');

const countDeletedMessagesById = (array) => {
  const map = {};

  for (let i = 0; i < array.length; i += 1) {
    const id = array[i].dataValues.messageId;
    map[id] = map[id] + 1 || 0;
  }

  return map;
};

exports.getMessages = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { conversationId } = req.params;
  const { search, date } = req.query;

  const query = [
    {
      conversationId: conversationId,
    },
  ];

  if (search) {
    query.push({
      message: {
        [Sequelize.Op.regexp]: `${search}`,
      },
    });
  }

  if (date) {
    query.push({
      createdAt: {
        [Sequelize.Op.gte]: new Date(date),
      },
    });
  }

  const messages = await Message.findAll({
    where: Sequelize.and(...query),
    include: {
      model: Attachment,
    },
    order: [['createdAt', 'DESC']],
  });

  if (messages.length < 1) {
    return next(new AppError('There are no messages for such conversation', 404));
  }

  const messagesWithoutDeleted = await filterDeletedMessages(user.dataValues.id, ...messages);

  if (!messagesWithoutDeleted.length) {
    return next(new AppError('There are no messages for such conversation', 404));
  }

  res.status(200).json({
    message: 'Your messages were retrieved successfully',
    data: {
      messages: messagesWithoutDeleted,
    },
  });
});

exports.getMessage = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { conversationId, messageId } = req.params;

  const message = await Message.findOne({
    where: Sequelize.and(
      {
        id: messageId,
      },
      { conversationId },
    ),
    include: {
      model: Attachment,
    },
  });

  if (!message) {
    return next(new AppError('There is no message with such id', 404));
  }

  if (
    !(await (await message.getConversation()).getUsers()).find(
      (participant) => participant.dataValues.id === user.dataValues.id,
    )
  ) {
    return next(new AppError('This message is not your', 403));
  }

  const messagesWithoutDeleted = await filterDeletedMessages(user.dataValues.id, message);

  if (!messagesWithoutDeleted[0]) {
    return next(new AppError('There is no message with such id', 404));
  }

  res.status(200).json({
    message: 'Your message was retrieved successfully',
    data: {
      message: messagesWithoutDeleted[0].dataValues,
    },
  });
});

exports.addMessage = catchAsync(async (req, res, next) => {
  const { user, files } = req;
  const { conversationId } = req.params;
  const { message, repliedMessageId } = req.body;

  const conversation = await findConversation(conversationId);

  if (!conversation) {
    return next(new AppError('There is no conversation with such id', 404));
  }

  const participants = await conversation.getUsers();
  if (!participants.find((participant) => participant.dataValues.id === user.dataValues.id)) {
    return next(new AppError('There is no conversation with such id for this user', 404));
  }
  if (conversation.dataValues.type === 'private') {
    const receiver = participants.find(
      (participant) => participant.dataValues.id !== user.dataValues.id,
    );

    if (await isUserBlockedByAnotherUser(user.dataValues.id, receiver)) {
      return next(new AppError('You were blocked by selected user', 400));
    }
  } else {
    //TODO: add a block list for group chats
  }

  if (repliedMessageId) {
    const repliedMessage = await Message.findByPk(repliedMessageId);

    if (!repliedMessage) {
      return next(new AppError('There is no message to reply with such id', 400));
    }

    const deletedMessageToReply = findOneDeletedMessage(user.dataValues.id, repliedMessageId);
    if (deletedMessageToReply) {
      return next(new AppError('There is no message to reply with such id', 400));
    }
  }

  await createMessage(conversationId, user.dataValues.id, message, repliedMessageId, files);

  res.status(201).json({ message: 'Your message was sent successfully' });
});

exports.editMessage = catchAsync(async (req, res, next) => {
  const { user, files } = req;
  const { conversationId, messageId } = req.params;
  const { message } = req.body;

  const foundMessage = await findOneMessage(messageId, conversationId, {
    senderId: user.dataValues.id,
  });

  if (!foundMessage) {
    return next(new AppError('There is no such message that you can edit', 404));
  }

  const messagesWithoutDeleted = await filterDeletedMessages(user.dataValues.id, foundMessage);

  if (!messagesWithoutDeleted[0]) {
    return next(new AppError('There is no message with such id', 404));
  }

  foundMessage.message = message;
  foundMessage.isEdited = true;

  await addAttachments(foundMessage, files);

  res.status(200).json({ message: 'Your message was edited successfully' });
});

exports.deleteMessage = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { conversationId } = req.params;
  const { messagesId } = req.body;

  const foundMessages = await Message.findAll({
    where: Sequelize.and({ id: messagesId }, { conversationId }),
  });

  if (foundMessages.length < 1) {
    return next(new AppError('There is no message with provided ids in this conversation', 404));
  }

  const conversation = await Conversation.findByPk(conversationId);

  if (conversation.dataValues.type === 'group') {
    const userRole = (await conversation.getUsers({ where: { id: user.dataValues.id } }))[0]
      .participants.dataValues.role;

    if (!['owner', 'admin'].includes(userRole)) {
      await Message.destroy({ where: { id: messagesId } });
    } else {
      const messagesToDelete = [];
      for (let i = 0; i < foundMessages.length; i += 1) {
        if (user.dataValues.id !== foundMessages[i].senderId) {
          return next(new AppError("You can't delete message that is not your", 403));
        }
        messagesToDelete.push(foundMessages[i].destroy());
      }
      await Promise.all(messagesToDelete);
    }

    return res.status(204).send();
  }

  const messagesWithoutDeleted = await filterDeletedMessages(user.dataValues.id, ...foundMessages);

  if (messagesWithoutDeleted.length < 1) {
    return next(new AppError('There is no messages with such ids', 404));
  }

  const deletedMessagesFromFound = messagesWithoutDeleted.map((message) =>
    DeletedMessage.create({
      messageId: message.dataValues.id,
      userId: user.dataValues.id,
    }),
  );

  await Promise.all(deletedMessagesFromFound);

  const deletedMessages = await DeletedMessage.findAll({
    where: {
      messageId: messagesId,
    },
  });

  const deletedMessagesMapGroupedById = countDeletedMessagesById(deletedMessages);

  const transactionsArr = [];

  // eslint-disable-next-line no-restricted-syntax, guard-for-in
  for (const key in deletedMessagesMapGroupedById) {
    const id = deletedMessagesMapGroupedById[key];
    if (deletedMessagesMapGroupedById[key] === 2) {
      transactionsArr.push(
        sequelize.transaction(
          async () =>
            await Promise.all([
              await DeletedMessage.destroy({ where: { messagesId: id } }),
              await Message.destroy({ where: { id } }),
              await Attachment.destroy({ where: { messagesId: id } }),
            ]),
        ),
      );
    }
  }

  await Promise.all(transactionsArr);

  res.status(204).send();
});

exports.unsendMessage = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { conversationId, messageId } = req.params;

  const foundMessage = await findOneMessage(messageId, conversationId, {
    senderId: user.dataValues.id,
  });

  if (!foundMessage || foundMessage.dataValues.isRead) {
    return next(new AppError('There is no such message that you can unsend', 404));
  }
  await sequelize.transaction(async () => {
    await foundMessage.removeAttachments();
    await foundMessage.destroy();
  });

  res.status(204).send();
});

exports.reactOnMessage = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { conversationId, messageId } = req.params;
  const { reaction } = req.body;

  const foundMessage = await findOneMessage(messageId, conversationId, {
    senderId: user.dataValues.id,
  });

  if (!foundMessage) {
    return next(new AppError('There is no such message to react to', 404));
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
    res.status(202).json({ message: 'Reaction was updated successfully' });
  } else {
    await MessageReaction.create({
      userId: user.dataValues.id,
      messageId,
      reaction,
    });

    res.status(201).send();
  }
});

//TODO: add a controller for forwarding messages
exports.forwardMessages = catchAsync(async (req, res, next) => {});
