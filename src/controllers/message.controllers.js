const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Message = require('../models/message.models');
const DeleteMessage = require('../models/deletedMessage.models');
const { Sequelize } = require('../db/db.config');
const Participant = require('../models/participant.models');
const Conversation = require('../models/conversation.models');

const filterDeletedMessages = async (userId, ...messages) => {
  const deletedMessages = await DeleteMessage.findAll({
    where: Sequelize.and({
      user_id: userId,
    }),
  });

  const deletedIds = deletedMessages.map((message) => message.dataValues.message_id);

  return messages.filter((message) => !deletedIds.includes(message.dataValues.id));
};

exports.getMessages = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { conversationId } = req.params;

  const messages = await Message.findAll({
    where: Sequelize.and(
      {
        sender_id: user.dataValues.id,
      },
      {
        conversation_id: conversationId,
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

  if (user.dataValues.id !== message.dataValues.sender_id) {
    return next(new AppError('This message is not your', 403));
  }

  const messagesWithoutDeleted = filterDeletedMessages(user.dataValues.id, message);

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

  const participant = await Participant.findOne({
    where: { user_id: user.dataValues.id },
    include: [
      {
        model: Conversation,
        where: {
          id: conversationId,
        },
      },
    ],
  });

  if (!participant) {
    return next(new AppError('There is no conversation with such id for this user', 404));
  }

  await Message.create({
    conversation_id: conversationId,
    sender_id: user.dataValues.id,
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
      conversation_id: conversationId,
      sender_id: user.dataValues.id,
    }),
  });

  if (!foundMessage) {
    return next(new AppError('There is no such message which you can edit', 404));
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
      conversation_id: conversationId,
      sender_id: user.dataValues.id,
    }),
  });

  if (!foundMessage) {
    return next(new AppError('There is no such message which you can edit', 404));
  }

  await DeleteMessage.create({
    message_id: messageId,
    user_id: user.dataValues.id,
  });

  res.status(204).send();
});
