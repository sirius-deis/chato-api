const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Conversation = require('../models/conversation.models');
const User = require('../models/user.models');
const Participant = require('../models/participant.models');
const { sequelize } = require('../db/db.config');

const findIfConversationExists = (arr1, arr2) => {
  const map = {};
  for (let i = 0; i < arr1.length; i += 1) {
    if (!arr1.conversation_id) {
      map[arr1.conversation_id] = true;
    }
  }

  for (let i = 0; i < arr2.length; i += 1) {
    if (map[arr2[i].conversation_id]) {
      return true;
    }
  }
  return false;
};

exports.getAllConversations = catchAsync(async (req, res, next) => {
  const { user } = req;
  const conversations = await Conversation.findByPk(user.id);
  if (!conversations) {
    return res.status(200).json({
      message: 'There is no conversations for this user',
    });
  }

  return res.status(200).json({
    message: 'Conversations were found',
  });
});

exports.createConversation = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { receiverId } = req.params;
  const receiver = await User.findByPk(receiverId);
  if (!receiver) {
    return next(new AppError('There is no user with such id', 404));
  }

  const participants = await Promise.all([user.getParticipants(), receiver.getParticipants()]);

  const isConversationExist = findIfConversationExists(...participants);

  if (isConversationExist) {
    return next(new AppError('Conversation with this user is already exists', 400));
  }

  await sequelize.transaction(async () => {
    await Conversation.create({ type: 'private' });
    await Promise.all([Participant.create({ user_id: user.id }), Participant.create({ user_id: receiver.id })]);
  });

  res.status(201).json({
    message: 'Conversation was created successfully',
  });
});

exports.deleteConversation = catchAsync(async (req, res, next) => {
  const { user } = req;

  res.status(201).json({
    message: 'Conversation was deleted successfully',
  });
});
