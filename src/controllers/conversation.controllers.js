const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Conversation = require('../models/conversation.models');
const Message = require('../models/message.models');
const User = require('../models/user.models');
const { Sequelize, sequelize } = require('../db/db.config');
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

const replaceConversationNamesWithUserName = async (conversationList, userId) =>
  await Promise.all(
    conversationList.map(async (conversation) => {
      if (conversation.dataValues.type === 'private') {
        const interlocutor = (
          await conversation.getUsers({
            where: {
              id: {
                [Sequelize.Op.not]: userId,
              },
            },
          })
        )[0];
        conversation.dataValues.title = interlocutor.get('userName');
      }
      return conversation;
    }),
  );

const addAmountOfUnreadMessages = async (conversationList) =>
  await Promise.all(
    conversationList.map(async (conversation) => {
      const unreadMessagesCount = await conversation.countMessages({
        where: {
          isRead: false,
        },
      });
      conversation.dataValues.unreadMessagesCount = unreadMessagesCount;
      return conversation;
    }),
  );

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
  const conversationsWithoutDeleted = conversations.filter(
    (conversation) => !deletedIds.includes(conversation.dataValues.id.toString()),
  );
  const conversationsWithReplacedNames = await replaceConversationNamesWithUserName(
    conversationsWithoutDeleted,
    user.dataValues.id,
  );
  const conversationList = await addAmountOfUnreadMessages(conversationsWithReplacedNames);

  return res.status(200).json({
    message: 'Conversations were found',
    data: {
      conversations: conversationList,
    },
  });
});

exports.createConversation = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { userId: userToInviteId } = req.params;

  if (isUserIdsTheSame(user.dataValues.id.toString(), userToInviteId)) {
    return next(new AppError("You can't start conversation with yourself", 400));
  }

  const receiver = await getReceiverIfExists(userToInviteId);
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

  await createConversation(user.dataValues.id, receiver.dataValues.id);

  res.status(201).json({
    message: 'Conversation was created successfully',
  });
});

exports.createGroupConversation = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { title } = req.body;

  await createConversation(user.dataValues.id, null, { title, type: 'group' });

  res.status(201).json({
    message: 'Group conversation was created successfully',
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

  if (conversation.dataValues.type === 'group') {
    const userRole = participants.find(
      (participant) => participant.dataValues.id === user.dataValues.id,
    ).dataValues.role;
    if (userRole !== 'owner') {
      return next(new AppError('You are not an owner of this group', 403));
    }
    await sequelize.transaction(async () => {
      await conversation.removeMessages();
      await conversation.removeUsers();
      await conversation.destroy();
    });
    return res.status(200).json({
      message: 'Conversation was deleted successfully',
    });
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

  res.status(200).json({
    message: 'Conversation was deleted successfully',
  });
});

exports.editConversation = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { conversationId } = req.params;
  const { title } = req.body;

  const conversation = await Conversation.findByPk(conversationId);
  if (!(await conversation.hasUser(user.dataValues.id))) {
    return next(new AppError('This conversation is not your', 403));
  }

  if (title && conversation.dataValues.type === 'private') {
    return next(new AppError("The name of private conversation can't be changed", 400));
  }

  conversation.dataValues.title = title;
  await conversation.save();

  res.status(204).json({
    message: 'Conversation was edited successfully',
  });
});

exports.addUserToGroupConversation = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { userId: userToInviteId, conversationId } = req.params;
  const conversation = await Conversation.findByPk(conversationId);

  if (!conversation) {
    return next(new AppError('There is no conversation with such id', 404));
  }

  if (!(await conversation.hasUser(user.dataValues.id))) {
    return next(new AppError("You don't have access right for this operation", 403));
  }

  const userToInvite = await User.findByPk(userToInviteId);

  if (!userToInvite) {
    return next(new AppError('There is no user with such id', 404));
  }

  if (conversation.dataValues.type === 'private') {
    return next(new AppError("You can't add people to private conversation", 400));
  }

  conversation.addUser(userToInviteId, { through: { role: 'user' } });

  await conversation.save();

  res.status(200).json({
    message: 'User was added to conversation successfully',
  });
});

exports.removeUserFromGroupConversation = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { userId: userToRemoveId, conversationId } = req.params;
  const conversation = await Conversation.findByPk(conversationId);

  if (!conversation) {
    return next(new AppError('There is no conversation with such id', 404));
  }

  if (!(await conversation.hasUser(user.dataValues.id))) {
    return next(new AppError("You don't have access right for this operation", 403));
  }

  const userToInvite = await User.findByPk(userToRemoveId);

  if (!userToInvite) {
    return next(new AppError('There is no user with such id', 404));
  }

  if (conversation.dataValues.type === 'private') {
    return next(new AppError("You can't perform such an operation to private conversation", 400));
  }

  conversation.removeUser({
    where: {
      userId: userToRemoveId,
    },
  });

  await conversation.save();

  res.status(200).json({
    message: 'User was removed from conversation successfully',
  });
});

exports.exitFromGroupConversation = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { conversationId } = req.params;
  const conversation = await Conversation.findByPk(conversationId);

  if (!conversation) {
    return next(new AppError('There is no conversation with such id', 404));
  }

  if (conversation.dataValues.type === 'private') {
    return next(new AppError("You can't perform such an operation to private conversation", 400));
  }

  conversation.removeUser({
    where: {
      userId: user.dataValues.id,
    },
  });

  await conversation.save();

  res.status(200).json({
    message: 'You have exited from conversation successfully',
  });
});

exports.joinGroupConversation = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { conversationId } = req.params;
  const conversation = await Conversation.findByPk(conversationId);

  if (!conversation) {
    return next(new AppError('There is no conversation with such id', 404));
  }

  if (conversation.dataValues.type === 'private') {
    return next(new AppError("You can't perform such an operation to private conversation", 400));
  }

  conversation.addUser(user.dataValues.id, { through: { role: 'user' } });

  await conversation.save();

  res.status(200).json({
    message: 'You have joined conversation successfully',
  });
});
