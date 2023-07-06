const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Conversation = require('../models/conversation.models');
const DeletedConversation = require('../models/deletedConversation.models');
const Message = require('../models/message.models');
const User = require('../models/user.models');
const Participant = require('../models/participant.models');
const { sequelize, Sequelize } = require('../db/db.config');

const findIfConversationExists = (arr1, arr2) => {
  const map = {};
  for (let i = 0; i < arr1.length; i += 1) {
    map[arr1[i].dataValues.conversationId] = true;
  }

  for (let i = 0; i < arr2.length; i += 1) {
    if (map[arr2[i].dataValues.conversationId]) {
      return map[arr2[i].dataValues.conversationId];
    }
  }

  return false;
};

exports.getAllConversations = catchAsync(async (req, res, next) => {
  const { user } = req;

  const participants = await Participant.findAll({
    where: {
      userId: user.id,
    },
    include: {
      model: Conversation,
      attributes: ['id', 'title', 'type', 'creatorId'],
      include: {
        model: Message,
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'messageType', 'message', 'senderId'],
        limit: 1,
      },
    },
  });

  if (!participants.length) {
    return res.status(200).json({
      message: "This user doesn't participate in any conversations",
      data: {
        conversations: [],
      },
    });
  }

  // eslint-disable-next-line max-len
  const deletedConversationsForUser = await DeletedConversation.findAll({
    where: { userId: user.dataValues.id },
  });
  const deletedIds = deletedConversationsForUser.map((conversation) => conversation.id);
  return res.status(200).json({
    message: 'Conversations were found',
    data: {
      conversations: participants
        .map((participant) => participant.conversations[0])
        .filter((conversation) => !deletedIds.includes(conversation.id)),
    },
  });
});

exports.createConversation = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { receiverId } = req.params;

  if (user.dataValues.id.toString() === receiverId) {
    return next(new AppError("You can't start conversation with yourself", 400));
  }

  const receiver = await User.findByPk(receiverId);

  if (!receiver) {
    return next(new AppError('There is no user with such id', 404));
  }

  const participantsArr = await Promise.all([
    Participant.findAll({ where: { userId: user.dataValues.id } }),
    Participant.findAll({ where: { userId: receiver.dataValues.id } }),
  ]);

  const conversationId = findIfConversationExists(...participantsArr);

  if (conversationId) {
    return next(new AppError('Conversation with this user is already exists', 400));
  }

  const blockList = await receiver.getBlocker();

  if (
    blockList.find(
      (blockedUser) => blockedUser.dataValues.id.toString() === user.dataValues.id.toString(),
    )
  ) {
    return next(new AppError('You were blocked by this user', 400));
  }

  await sequelize.transaction(async () => {
    const conversation = await Conversation.create({
      type: 'private',
      creatorId: user.dataValues.id,
    });
    conversation.addUser(user.dataValues.id, { through: { role: 'user' } });
    conversation.addUser(receiver.dataValues.id, { through: { role: 'user' } });
    await conversation.save();
  });

  res.status(201).json({
    message: 'Conversation was created successfully',
  });
});

exports.deleteConversation = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { conversationId } = req.params;

  const conversation = await Conversation.findByPk(conversationId);

  if (!conversation) {
    return next(new AppError('There is no such conversation', 404));
  }

  // eslint-disable-next-line max-len
  const participants = await Participant.findAll({
    where: { userId: user.id },
    include: [{ model: Conversation }],
  });
  const participantInConversation = participants.find(
    // eslint-disable-next-line max-len
    (participant) =>
      participant.dataValues.conversations[0].dataValues.id === conversation.dataValues.id,
  );

  if (!participantInConversation) {
    return next(new AppError('There is no such conversation for selected user', 401));
  }

  const isDeleted = await DeletedConversation.findOne({
    where: Sequelize.and(
      {
        userId: user.dataValues.id,
      },
      { conversationId: conversationId },
    ),
  });

  if (isDeleted) {
    return next(new AppError('This conversation is already deleted', 400));
  }

  if (participantInConversation) {
    // eslint-disable-next-line max-len
    await DeletedConversation.create({
      userId: user.dataValues.id,
      conversationId: conversationId,
    });
  }

  res.status(204).json({
    message: 'Conversation was deleted successfully',
  });
});
