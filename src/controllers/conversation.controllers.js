const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Conversation = require('../models/conversation.models');
const DeletedConversation = require('../models/deletedConversation.models');
const User = require('../models/user.models');
const Participant = require('../models/participant.models');
const { sequelize, Sequelize } = require('../db/db.config');

const findIfConversationExists = (arr1, arr2) => {
  const map = {};
  for (let i = 0; i < arr1.length; i += 1) {
    if (arr1[i].dataValues.conversations[0]) {
      map[arr1[i].dataValues.conversations[0].dataValues.id] = true;
    }
  }

  for (let i = 0; i < arr2.length; i += 1) {
    if (map[arr2[i].dataValues.conversations[0]?.dataValues.id]) {
      return map[arr2[i].dataValues.conversations[0].dataValues.id];
    }
  }
  return false;
};

exports.getAllConversations = catchAsync(async (req, res, next) => {
  const { user } = req;

  const participants = await Participant.findAll({
    where: {
      user_id: user.id,
    },
    include: {
      model: Conversation,
      attributes: ['id', 'title', 'type', 'creator_id'],
    },
  });

  if (!participants.length) {
    return res.status(200).json({
      message: "This user doesn't participate in any conversations",
    });
  }

  const deletedConversationsForUser = await DeletedConversation.findAll({ where: { user_id: user.dataValues.id } });
  const deletedIds = deletedConversationsForUser.map((conversation) => conversation.id);
  return res.status(200).json({
    message: 'Conversations were found',
    conversations: participants
      .map((participant) => participant.conversations[0])
      .filter((conversation) => deletedIds.includes(conversation.id)),
  });
});

exports.createConversation = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { receiverId } = req.params;
  const receiver = await User.findByPk(receiverId);

  if (user.dataValues.id.toString() === receiverId) {
    return next(new AppError("You can't start conversation with yourself", 404));
  }

  if (!receiver) {
    return next(new AppError('There is no user with such id', 404));
  }
  const participantsArr = await Promise.all([
    Participant.findAll({ where: { user_id: user.id }, include: [{ model: Conversation }] }),
    Participant.findAll({ where: { user_id: receiver.id }, include: [{ model: Conversation }] }),
  ]);

  const conversationId = findIfConversationExists(...participantsArr);

  if (conversationId) {
    return next(new AppError('Conversation with this user is already exists', 400));
  }

  await sequelize.transaction(async () => {
    const conversation = await Conversation.create({ type: 'private', creator_id: user.id });
    const participants = await Promise.all([
      Participant.create({
        user_id: user.id,
      }),
      Participant.create({
        user_id: receiverId,
      }),
    ]);
    await participants[0].addConversation(conversation.dataValues.id, participants[0].dataValues.id);
    await participants[1].addConversation(conversation.dataValues.id, participants[1].dataValues.id);
  });

  res.status(201).json({
    message: 'Conversation was created successfully',
  });
});

exports.deleteConversation = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { conversationId } = req.params;

  const conversation = await Conversation.findByPk(conversationId);

  const participants = await Participant.findAll({ where: { user_id: user.id }, include: [{ model: Conversation }] });
  const participantInConversation = participants.find(
    (participant) => participant.dataValues.conversations[0].dataValues.id === conversation.dataValues.id,
  );

  if (!participantInConversation) {
    return next(new AppError('There is no such conversation', 404));
  }

  const isDeleted = await DeletedConversation.findOne({
    where: Sequelize.and(
      {
        user_id: user.dataValues.id,
      },
      { conversation_id: conversationId },
    ),
  });

  if (isDeleted) {
    return next(new AppError('There conversation is already deleted', 404));
  }

  if (participantInConversation) {
    await DeletedConversation.create({ user_id: user.dataValues.id, conversation_id: conversationId });
  }

  res.status(201).json({
    message: 'Conversation was deleted successfully',
  });
});
