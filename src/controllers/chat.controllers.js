const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Message = require('../models/message.models');
const User = require('../models/user.models');
const Participant = require('../models/participant.models');
const { Sequelize, sequelize } = require('../db/db.config');
const DeletedMessage = require('../models/deletedMessage.models');
const DeletedConversation = require('../models/deletedConversation.models');
const GroupBlockList = require('../models/groupBlockList');
const {
  isUserIdsTheSame,
  getReceiverIfExists,
  isUserBlocked,
  findConversationId,
  checkIfConversationWasDeletedAndRestoreIfYes,
  createChat,
  findChat,
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

const checkChatType = (chat, type) => chat.dataValues.type === type;

exports.getAllChats = catchAsync(async (req, res, next) => {
  const { user } = req;

  const chats = await user.getChats({
    include: [
      {
        model: Message,
        order: [['createdAt', 'DESC']],
        limit: 1,
      },
    ],
  });

  if (!chats.length) {
    return res.status(200).json({
      message: "This user doesn't participate in any conversations",
      data: {
        chats: [],
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
  const chatsWithoutDeleted = chats.filter(
    (chat) => !deletedIds.includes(chat.dataValues.id.toString()),
  );
  const chatsWithReplacedNames = await replaceConversationNamesWithUserName(
    chatsWithoutDeleted,
    user.dataValues.id,
  );
  const chatList = await addAmountOfUnreadMessages(chatsWithReplacedNames);

  return res.status(200).json({
    message: 'Conversations were found',
    data: {
      chats: chatList,
    },
  });
});

exports.createPrivateChat = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { userId: receiverId } = req.params;

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

  await createChat(user.dataValues.id, receiver.dataValues.id);

  res.status(201).json({
    message: 'Conversation was created successfully',
  });
});

exports.createGroupChat = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { title } = req.body;
  await createChat(user.dataValues.id, null, { title, type: 'group' });

  res.status(201).json({
    message: 'Group conversation was created successfully',
  });
});

exports.deleteChat = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { chatId } = req.params;

  const chat = await findChat(chatId, Message);

  if (!chat) {
    return next(new AppError('There is no such conversation', 404));
  }

  const participants = await chat.getUsers();
  if (
    !participants.find(
      (participant) => participant.dataValues.id.toString() === user.dataValues.id.toString(),
    )
  ) {
    return next(new AppError('There is no such conversation for selected user', 400));
  }

  if (chat.dataValues.type === 'group') {
    const userRole = participants.find(
      (participant) => participant.dataValues.id === user.dataValues.id,
    ).dataValues.role;
    if (userRole !== 'owner') {
      return next(new AppError('You are not an owner of this group', 403));
    }
    await sequelize.transaction(async () => {
      await chat.removeMessages();
      await chat.removeUsers();
      await chat.destroy();
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
      { chatId },
    ),
  });

  if (isDeleted) {
    return next(new AppError('This conversation is already deleted', 400));
  }

  const deletedMessagePromises = chat.dataValues.messages.map(
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
    chatId,
  });

  res.status(200).json({
    message: 'Conversation was deleted successfully',
  });
});

exports.editChat = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { chatId } = req.params;
  const { title } = req.body;

  const chat = await findChat(chatId);
  if (!(await chat.hasUser(user.dataValues.id))) {
    return next(new AppError('This conversation is not your', 403));
  }

  if (title && chat.dataValues.type === 'private') {
    return next(new AppError("The name of private conversation can't be changed", 400));
  }

  chat.dataValues.title = title;
  await chat.save();

  res.status(204).json({
    message: 'Conversation was edited successfully',
  });
});

exports.addUserToGroupChat = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { userId: userToInviteId, chatId } = req.params;
  const chat = await findChat(chatId);

  if (!chat) {
    return next(new AppError('There is no conversation with such id', 404));
  }

  if (!(await chat.hasUser(user.dataValues.id))) {
    return next(new AppError("You don't have access right for this operation", 403));
  }

  const userToInvite = await User.findByPk(userToInviteId);

  if (!userToInvite) {
    return next(new AppError('There is no user with such id', 404));
  }

  if (chat.dataValues.type === 'private') {
    return next(new AppError("You can't add people to private conversation", 400));
  }

  const groupBlockList = await GroupBlockList.findOne({
    where: Sequelize.and({ userId: user.dataValues.id }, { chatId }),
  });
  if (groupBlockList) {
    return next(new AppError('You were blocked this group', 400));
  }

  chat.addUser(userToInviteId, { through: { role: 'user' } });

  await chat.save();

  res.status(200).json({
    message: 'User was added to conversation successfully',
  });
});

exports.removeUserFromGroupChat = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { userId: userToRemoveId, chatId } = req.params;
  const chat = await findChat(chatId);

  if (!chat) {
    return next(new AppError('There is no conversation with such id', 404));
  }

  if (!(await chat.hasUser(user.dataValues.id))) {
    return next(new AppError("You don't have access right for this operation", 403));
  }

  const userToInvite = await User.findByPk(userToRemoveId);

  if (!userToInvite) {
    return next(new AppError('There is no user with such id', 404));
  }

  if (!checkChatType(chat, 'group')) {
    return next(new AppError("You can't perform such an operation to private conversation", 400));
  }

  chat.removeUser({
    where: {
      userId: userToRemoveId,
    },
  });

  await chat.save();

  res.status(200).json({
    message: 'User was removed from conversation successfully',
  });
});

exports.leaveGroupChat = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { chatId } = req.params;
  const chat = await findChat(chatId);

  if (!chat) {
    return next(new AppError('There is no conversation with such id', 404));
  }

  if (!checkChatType(chat, 'group')) {
    return next(new AppError("You can't perform such an operation to private conversation", 400));
  }

  chat.removeUser({
    where: {
      userId: user.dataValues.id,
    },
  });

  await chat.save();

  res.status(200).json({
    message: 'You have exited from conversation successfully',
  });
});

exports.joinGroupChat = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { chatId } = req.params;
  const chat = await findChat(chatId);

  if (!chat) {
    return next(new AppError('There is no conversation with such id', 404));
  }

  if (!checkChatType(chat, 'group')) {
    return next(new AppError("You can't perform such an operation to private conversation", 400));
  }

  const groupBlockList = await GroupBlockList.findOne({
    where: Sequelize.and({ userId: user.dataValues.id }, { chatId }),
  });
  if (groupBlockList) {
    return next(new AppError('You were blocked this group', 400));
  }

  chat.addUser(user.dataValues.id, { through: { role: 'user' } });

  await chat.save();

  res.status(200).json({
    message: 'You have joined conversation successfully',
  });
});

exports.getListOfChatParticipants = catchAsync(async (req, res, next) => {
  const { chatId } = req.params;
  const chat = await findChat(chatId);

  if (!chat) {
    return next(new AppError('There is no conversation with such id', 404));
  }

  const participants = await chat.getUsers();

  if (participants.length < 1) {
    return next(new AppError('There is no participants in this conversation', 404));
  }

  res.status(200).json({
    message: 'Conversation participants were found successfully',
    data: {
      participants,
    },
  });
});

exports.changeUserRoleInChat = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { userId: userToChangeRoleId, chatId } = req.params;
  const { role } = req.body;
  const chat = await findChat(chatId);

  if (!chat) {
    return next(new AppError('There is no conversation with such id', 404));
  }

  if (!checkChatType(chat, 'group')) {
    return next(new AppError("You can't perform such an operation to private conversation", 400));
  }

  if (!['user', 'admin', 'owner'].includes(role)) {
    return next(new AppError('Incorrect role', 400));
  }

  const participants = await chat.getUsers({
    where: {
      id: user.dataValues.id,
    },
  });

  const mainParticipant = participants[0].participants.dataValues;

  if (['user', 'admin'].includes(mainParticipant.role)) {
    return next(new AppError("You can't change users role with your current role", 403));
  }

  await Participant.update(
    { role },
    {
      where: Sequelize.and({ userId: userToChangeRoleId }, { chatId }),
    },
  );

  res.status(200).json({
    message: 'User role was changed successfully',
  });
});
