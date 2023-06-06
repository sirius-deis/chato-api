const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Message = require('../models/message.models');
const DeleteMessage = require('../models/deletedMessage.models');
const { Sequelize } = require('../db/db.config');

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

  const deletedMessages = await DeleteMessage.findAll({
    where: Sequelize.and({
      user_id: user.dataValues.id,
    }),
  });

  const deletedIds = deletedMessages.map((message) => message.dataValues.message_id);

  const messagesWithoutDeleted = messages.filter((message) => deletedIds.includes(message.dataValues.id));

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
  const { conversationId } = req.params;

  res.status(200).json({ message: 'Your messages was retrieved successfully' });
});

exports.addMessage = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { conversationId } = req.params;

  res.status(201).json({ message: 'Your message was sent successfully' });
});

exports.editMessage = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { conversationId, messageId } = req.params;

  res.status(200).json({ message: 'Your message was edited successfully' });
});

exports.deleteMessage = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { conversationId, messageId } = req.params;

  res.status(204).send();
});
