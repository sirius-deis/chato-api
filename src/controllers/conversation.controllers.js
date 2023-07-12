const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Conversation = require('../models/conversation.models');
const Message = require('../models/message.models');
const { sequelize, Sequelize } = require('../db/db.config');
const DeletedMessage = require('../models/deletedMessage.models');
const DeletedConversation = require('../models/deletedConversation.models');
const {
  isUserIdsTheSame,
  getReceiverIfExists,
  isUserBlocked,
  findConversationId,
  checkIfConversationWasDeletedAndRestoreIfYes,
  createConversation,
} = require('../utils/conversation');

exports.getAllConversations = catchAsync(async (req, res, next) => {
  const { user } = req;

  const conversations = await user.getConversations({
    include: [
      {
        model: Message,
        order: [['createdAt', 'DESC']],
        limit: 1,
      },
    ],
  });

  if (!conversations.length) {
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
  const deletedIds = deletedConversationsForUser.map(
    (conversation) => conversation.dataValues.id.toString(),
    // eslint-disable-next-line function-paren-newline
  );
  return res.status(200).json({
    message: 'Conversations were found',
    data: {
      conversations: conversations.filter(
        (conversation) => !deletedIds.includes(conversation.dataValues.id.toString()),
      ),
    },
  });
});

exports.createConversation = catchAsync(async (req, res, next) => {
  const { user, files } = req;
  const { receiverId } = req.params;
  const { title } = req.body;

  if (isUserIdsTheSame(user.dataValues.id.toString(), receiverId)) {
    return next(new AppError("You can't start conversation with yourself", 400));
  }

  const receiver = await getReceiverIfExists(receiverId);
  if (!receiver) {
    return next(new AppError('There is no user with such id', 404));
  }

  if (await isUserBlocked(user.dataValues.id.toString(), receiver)) {
    return next(new AppError('You were blocked by this user', 400));
  }

  const conversationId = await findConversationId(user, receiver);

  if (conversationId) {
    if (await checkIfConversationWasDeletedAndRestoreIfYes(user.dataValues.id, conversationId)) {
      return res.status(200).json({
        message: 'Conversation was created successfully',
      });
    }
    return next(new AppError('Conversation with this user is already exists', 400));
  }

  await createConversation(user.dataValues.id, receiver.dataValues.id, title);

  res.status(201).json({
    message: 'Conversation was created successfully',
  });
});

exports.deleteConversation = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { conversationId } = req.params;

  const conversation = await Conversation.findByPk(conversationId, {
    include: {
      model: Message,
    },
  });

  if (!conversation) {
    return next(new AppError('There is no such conversation', 404));
  }

  const participants = await conversation.getUsers();
  if (
    !participants.find(
      (participant) => participant.dataValues.id.toString() === user.dataValues.id.toString(),
    )
  ) {
    return next(new AppError('There is no such conversation for selected user', 400));
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

  const deletedMessagePromises = conversation.dataValues.messages.map(
    (message) =>
      DeletedMessage.findOrCreate({
        where: {
          messageId: message.dataValues.id,
        },
        defaults: {
          messageId: message.dataValues.id,
          userId: user.dataValues.id,
        },
      }),
    // eslint-disable-next-line function-paren-newline
  );

  await Promise.all(deletedMessagePromises);

  await DeletedConversation.create({
    userId: user.dataValues.id,
    conversationId: conversationId,
  });

  res.status(204).json({
    message: 'Conversation was deleted successfully',
  });
});

//TODO: create edit conversation controller
exports.editConversation = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { conversationId } = req.params;
  const { title } = req.body;

  res.status(204).json({
    message: 'Conversation was edited successfully',
  });
});
