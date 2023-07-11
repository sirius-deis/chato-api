const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Message = require('../models/message.models');
const DeletedMessage = require('../models/deletedMessage.models');
const { Sequelize } = require('../db/db.config');
const Participant = require('../models/participant.models');
const Conversation = require('../models/conversation.models');

const filterDeletedMessages = async (userId, ...messages) => {
  const deletedMessages = await DeletedMessage.findAll({
    where: Sequelize.and(
      {
        userId: userId,
      },
      {
        messageId: messages.map((message) => message.dataValues.id.toString()),
      },
    ),
  });

  const deletedIds = deletedMessages.map((message) => message.dataValues.messageId.toString());

  return messages.filter((message) => !deletedIds.includes(message.dataValues.id.toString()));
};

exports.getMessages = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { conversationId } = req.params;

  const messages = await Message.findAll({
    where: Sequelize.and(
      {
        senderId: user.dataValues.id,
      },
      {
        conversationId: conversationId,
      },
    ),
  });

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
  const { messageId } = req.params;

  const message = await Message.findByPk(messageId);

  if (!message) {
    return next(new AppError('There is no message with such id', 404));
  }

  if (user.dataValues.id !== message.dataValues.senderId) {
    return next(new AppError('This message is not your', 403));
  }

  const messagesWithoutDeleted = await filterDeletedMessages(user.dataValues.id, message);

  if (!messagesWithoutDeleted[0]) {
    return next(new AppError('There is no message with such id', 404));
  }

  res.status(200).json({
    message: 'Your messages was retrieved successfully',
    data: {
      message: messagesWithoutDeleted[0],
    },
  });
});

exports.addMessage = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { conversationId } = req.params;
  const { message } = req.body;

  const conversation = await Conversation.findByPk(conversationId);

  if (!conversation) {
    return next(new AppError('There is no conversation with such id', 404));
  }

  const participants = await conversation.getUsers();

  if (!participants.length) {
    return next(new AppError('There is no conversation with such id for this user', 404));
  }

  if (conversation.dataValues.type === 'private') {
    const receiver = participants.find(
      (participant) => participant.dataValues.id.toString() !== user.dataValues.id.toString(),
    );
    const blockList = await receiver.getBlocker();

    if (
      blockList.find(
        (blockedUser) => blockedUser.dataValues.id.toString() === user.dataValues.id.toString(),
      )
    ) {
      return next(new AppError('You were blocked by selected user', 400));
    }
  } else {
    //TODO: add a block list for group chats
  }

  await Message.create({
    conversationId: conversationId,
    senderId: user.dataValues.id,
    message,
  });

  res.status(201).json({ message: 'Your message was sent successfully' });
});

exports.editMessage = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { conversationId, messageId } = req.params;
  const { message } = req.body;

  const foundMessage = await Message.findOne({
    where: Sequelize.and({
      id: messageId,
      conversationId: conversationId,
      senderId: user.dataValues.id,
    }),
  });

  if (!foundMessage) {
    return next(new AppError('There is no such message that you can edit', 404));
  }

  const messagesWithoutDeleted = await filterDeletedMessages(user.dataValues.id, foundMessage);

  if (!messagesWithoutDeleted[0]) {
    return next(new AppError('There is no message with such id', 404));
  }

  foundMessage.message = message;

  await foundMessage.save();

  res.status(200).json({ message: 'Your message was edited successfully' });
});

exports.deleteMessage = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { conversationId, messageId } = req.params;

  const foundMessage = await Message.findOne({
    where: Sequelize.and({
      id: messageId,
      conversationId: conversationId,
      senderId: user.dataValues.id,
    }),
  });

  if (!foundMessage) {
    return next(new AppError('There is no such message that you can delete', 404));
  }

  const messagesWithoutDeleted = await filterDeletedMessages(user.dataValues.id, foundMessage);

  if (!messagesWithoutDeleted[0]) {
    return next(new AppError('There is no message with such id', 404));
  }

  await DeletedMessage.create({
    messageId: messageId,
    userId: user.dataValues.id,
  });

  res.status(204).send();
});

exports.unsendMessage = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { conversationId, messageId } = req.params;

  const foundMessage = await Message.findOne({
    where: Sequelize.and({
      id: messageId,
      conversationId: conversationId,
      senderId: user.dataValues.id,
    }),
  });

  if (!foundMessage || foundMessage.dataValues.isRead) {
    return next(new AppError('There is no such message that you can unsend', 404));
  }

  await foundMessage.destroy();

  res.status(204).send();
});
