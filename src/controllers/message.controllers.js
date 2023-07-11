const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Message = require('../models/message.models');
const DeletedMessage = require('../models/deletedMessage.models');
const { Sequelize } = require('../db/db.config');
const Conversation = require('../models/conversation.models');
const MessageReaction = require('../models/messageReaction.models');

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
  const { user } = req;
  const { conversationId } = req.params;
  const { message, repliedMessageId } = req.body;

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

  const repliedMessage = await Message.findByPk(repliedMessageId);

  const deletedMessage = await DeletedMessage.findOne({
    where: Sequelize.and(
      {
        userId: user.dataValues.id,
      },
      {
        messageId: repliedMessageId,
      },
    ),
  });

  if (!repliedMessage || deletedMessage) {
    return next(new AppError('There is no message to reply with such id', 400));
  }

  await Message.create({
    conversationId: conversationId,
    senderId: user.dataValues.id,
    message,
    repliedMessageId,
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
  foundMessage.isEdited = true;

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

exports.reactOnMessage = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { conversationId, messageId } = req.params;
  const { reaction } = req.body;

  const foundMessage = await Message.findOne({
    where: Sequelize.and({
      id: messageId,
      conversationId: conversationId,
      senderId: user.dataValues.id,
    }),
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
