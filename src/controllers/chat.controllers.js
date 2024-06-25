const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const Message = require("../models/message.models");
const User = require("../models/user.models");
const Participant = require("../models/participant.models");
const { Sequelize, sequelize } = require("../db/db.config");
const DeletedMessage = require("../models/deletedMessage.models");
const DeletedChat = require("../models/deletedChat.models");
const GroupBlockList = require("../models/groupBlockList");
const {
  isUserIdsTheSame,
  getReceiverIfExists,
  isUserBlocked,
  findChatId,
  checkIfChatWasDeletedAndRestoreIfYes,
  createChat,
  findChat,
} = require("../utils/chat");
const Chat = require("../models/chat.models");

const addAmountOfUnreadMessages = async (chatList, userId) =>
  await Promise.all(
    chatList.map(async (chat) => {
      const unreadMessagesCount = await chat.countMessages({
        where: {
          isRead: false,
          senderId: {
            [Sequelize.Op.ne]: userId,
          },
        },
      });
      chat.dataValues.unreadMessagesCount = unreadMessagesCount;
      return chat;
    })
  );

const checkChatType = (chat, type) => {
  if (chat.dataValues.type === type) {
    return true;
  }
};

const checkRolesAccess = (role, roles) => {
  if (roles.includes(role)) {
    return true;
  }
};

exports.getAllChats = catchAsync(async (req, res, next) => {
  const { user } = req;

  const chats = await user.getChats({
    include: [
      {
        model: Message,
        order: [["createdAt", "DESC"]],
        limit: 1,
      },
    ],
  });

  if (!chats.length) {
    return res.status(200).json({
      message: "This user doesn't participate in any chats",
      data: {
        chats: [],
      },
    });
  }

  // eslint-disable-next-line max-len
  const deletedChatsForUser = await DeletedChat.findAll({
    where: { userId: user.dataValues.id },
  });
  const deletedIds = deletedChatsForUser.map(
    (conversation) => conversation.dataValues.id.toString()
    // eslint-disable-next-line function-paren-newline
  );
  const chatsWithoutDeleted = chats.filter(
    (chat) => !deletedIds.includes(chat.dataValues.id.toString())
  );
  const chatList = await addAmountOfUnreadMessages(
    chatsWithoutDeleted,
    user.id
  );

  return res.status(200).json({
    message: "Chats were found",
    data: {
      chats: chatList,
    },
  });
});

exports.findChats = catchAsync(async (req, res, next) => {
  const { term } = req;
  const users = await User.find({
    where: {
      $or: [{ email: { $regexp: term } }, { userName: { $regexp: term } }],
    },
  });
  const chats = await Chat.find({ where: { title: term } });

  if (users.length < 1 || chats.length < 1) {
    return res.status(404).json({
      message: "There is no chat with such name",
      data: {
        chats: [],
      },
    });
  }

  return res.status(200).json({
    message: "Chats were found",
    data: { chats: [...users, ...chats] },
  });
});

exports.createPrivateChat = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { userId: receiverId } = req.params;

  if (isUserIdsTheSame(user.dataValues.id.toString(), receiverId)) {
    return next(new AppError("You can't start a chat with yourself", 400));
  }

  const receiver = await getReceiverIfExists(receiverId);
  if (!receiver) {
    return next(new AppError("There is no user with such id", 404));
  }

  if (await isUserBlocked(user.dataValues.id.toString(), receiver)) {
    return next(new AppError("You were blocked by this user", 400));
  }

  const chatId = await findChatId(user, receiver);

  if (chatId) {
    if (
      await checkIfChatWasDeletedAndRestoreIfYes(user.dataValues.id, chatId)
    ) {
      return res.status(200).json({
        message: "Chat was created successfully",
      });
    }
    return next(new AppError("Chat with this user is already exists", 400));
  }

  await createChat(user.dataValues.id, receiver.dataValues.id, {
    title: receiver.get("userName"),
  });

  res.status(201).json({
    message: "Chat was created successfully",
  });
});

exports.createGroupChat = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { title } = req.body;
  await createChat(user.dataValues.id, null, { title, type: "group" });

  res.status(201).json({
    message: "Group chat was created successfully",
  });
});

exports.deleteChat = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { chatId } = req.params;

  const chat = await findChat(chatId, Message);

  if (!chat) {
    return next(new AppError("There is no such chat", 404));
  }

  const participants = await chat.getUsers();
  if (
    !participants.find(
      (participant) =>
        participant.dataValues.id.toString() === user.dataValues.id.toString()
    )
  ) {
    return next(new AppError("There is no such chat for selected user", 400));
  }

  if (chat.dataValues.type === "group") {
    const userRole = participants.find(
      (participant) => participant.dataValues.id === user.dataValues.id
    ).dataValues.role;
    if (userRole !== "owner") {
      return next(new AppError("You are not an owner of this group", 403));
    }
    await sequelize.transaction(async () => {
      await chat.removeMessages();
      await chat.removeUsers();
      await chat.destroy();
    });
    return res.status(200).json({
      message: "Chat was deleted successfully",
    });
  }

  const isDeleted = await DeletedChat.findOne({
    where: Sequelize.and(
      {
        userId: user.dataValues.id,
      },
      { chatId }
    ),
  });

  if (isDeleted) {
    return next(new AppError("This chat is already deleted", 400));
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
      })
    // eslint-disable-next-line function-paren-newline
  );

  await Promise.all(deletedMessagePromises);

  await DeletedChat.create({
    userId: user.dataValues.id,
    chatId,
  });

  res.status(200).json({
    message: "Chat was deleted successfully",
  });
});

exports.editChat = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { chatId } = req.params;
  const { title } = req.body;

  const chat = await findChat(chatId);
  if (!(await chat.hasUser(user.dataValues.id))) {
    return next(new AppError("This chat is not your", 403));
  }

  if (title && chat.dataValues.type === "private") {
    return next(new AppError("The name of private chat can't be changed", 400));
  }

  chat.dataValues.title = title;
  await chat.save();

  res.status(204).json({
    message: "Chat was edited successfully",
  });
});

exports.addUserToGroupChat = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { userId: userToInviteId, chatId } = req.params;
  const chat = await findChat(chatId);

  if (!chat) {
    return next(new AppError("There is no chat with such id", 404));
  }

  if (!(await chat.hasUser(user.dataValues.id))) {
    return next(
      new AppError("You don't have access right for this operation", 403)
    );
  }

  const userToInvite = await User.findByPk(userToInviteId);

  if (!userToInvite) {
    return next(new AppError("There is no user with such id", 404));
  }

  if (chat.dataValues.type === "private") {
    return next(new AppError("You can't add people to private chat", 400));
  }

  if (await chat.hasUser(userToInviteId)) {
    return next(new AppError("Provided user is already in this group", 401));
  }

  const groupBlockList = await GroupBlockList.findOne({
    where: Sequelize.and({ userId: user.dataValues.id }, { chatId }),
  });
  if (groupBlockList) {
    return next(new AppError("You were blocked by this group", 400));
  }

  chat.addUser(userToInviteId, { through: { role: "user" } });

  await chat.save();

  res.status(200).json({
    message: "User was added to chat successfully",
  });
});

exports.removeUserFromGroupChat = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { userId: userToRemoveId, chatId } = req.params;
  const chat = await findChat(chatId);

  if (!chat) {
    return next(new AppError("There is no chat with such id", 404));
  }

  if (!(await chat.hasUser(user.dataValues.id))) {
    return next(
      new AppError("You don't have access right for this operation", 403)
    );
  }

  const userToInvite = await User.findByPk(userToRemoveId);

  if (!userToInvite) {
    return next(new AppError("There is no user with such id", 404));
  }

  if (!checkChatType(chat, "group")) {
    return next(
      new AppError("You can't perform such an operation to private chat", 400)
    );
  }

  chat.removeUser({
    where: {
      userId: userToRemoveId,
    },
  });

  await chat.save();

  res.status(200).json({
    message: "User was removed from chat successfully",
  });
});

exports.leaveGroupChat = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { chatId } = req.params;
  const chat = await findChat(chatId);

  if (!chat) {
    return next(new AppError("There is no chat with such id", 404));
  }

  if (!checkChatType(chat, "group")) {
    return next(
      new AppError("You can't perform such an operation to private chat", 400)
    );
  }

  chat.removeUser({
    where: {
      userId: user.dataValues.id,
    },
  });

  await chat.save();

  res.status(200).json({
    message: "You have exited from chat successfully successfully",
  });
});

exports.joinGroupChat = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { chatId } = req.params;
  const chat = await findChat(chatId);

  if (!chat) {
    return next(new AppError("There is no chat with such id", 404));
  }

  if (!checkChatType(chat, "group")) {
    return next(
      new AppError("You can't perform such an operation to private chat", 400)
    );
  }

  const groupBlockList = await GroupBlockList.findOne({
    where: Sequelize.and({ userId: user.dataValues.id }, { chatId }),
  });
  if (groupBlockList) {
    return next(new AppError("You were blocked this group", 400));
  }

  chat.addUser(user.dataValues.id, { through: { role: "user" } });

  await chat.save();

  res.status(200).json({
    message: "You have joined chat successfully",
  });
});

exports.getListOfChatParticipants = catchAsync(async (req, res, next) => {
  const { chatId } = req.params;
  const chat = await findChat(chatId);

  if (!chat) {
    return next(new AppError("There is no chat with such id", 404));
  }

  const participants = await chat.getUsers();

  if (participants.length < 1) {
    return next(new AppError("There is no participants in this chat", 404));
  }

  res.status(200).json({
    message: "Chat participants were found successfully",
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
    return next(new AppError("There is no chat with such id", 404));
  }

  if (!checkChatType(chat, "group")) {
    return next(
      new AppError("You can't perform such an operation to private chat", 403)
    );
  }

  if (!["user", "admin", "owner"].includes(role)) {
    return next(new AppError("Incorrect role", 400));
  }

  const participants = await chat.getUsers({
    where: {
      id: user.dataValues.id,
    },
  });

  const mainParticipant = participants[0].participants.dataValues;

  if (checkRolesAccess(mainParticipant.role, ["user", "admin"])) {
    return next(
      new AppError("You can't change users role with your current role", 403)
    );
  }

  await Participant.update(
    { role },
    {
      where: Sequelize.and({ userId: userToChangeRoleId }, { chatId }),
    }
  );

  res.status(200).json({
    message: "User role was changed successfully",
  });
});

exports.addPicture = catchAsync(async (req, res, next) => {
  const { user, chatId, file } = req;
  const { buffer } = file;

  const chat = await findChat(chatId);

  const participants = await chat.getUsers();

  const participant = participants.find(
    (participant) =>
      participant.dataValues.id.toString() === user.dataValues.id.toString()
  );
  if (!participant) {
    return next(new AppError("There is no such chat for selected user", 403));
  }

  if (!checkRolesAccess(participant.role, ["owner"])) {
    return next(
      new AppError(
        "You can't perform such an operation with your current role",
        403
      )
    );
  }

  const cldResponse = await resizeAndSave(
    buffer,
    { width: 100, height: 100 },
    "jpeg",
    "chats"
  );

  await chat.createPicture({
    fileUrl: cldResponse.secure_url,
    publicId: cldResponse.public_id,
  });

  await chat.save();

  res.status(200).json({ message: "Photo was added successfully" });
});

exports.deletePicture = catchAsync(async (req, res, next) => {
  const { user, chatId } = req;
  const { photoId } = req.params;

  const chat = await findChat(chatId);

  const participants = await chat.getUsers();

  const participant = participants.find(
    (participant) =>
      participant.dataValues.id.toString() === user.dataValues.id.toString()
  );
  if (!participant) {
    return next(new AppError("There is no such chat for selected user", 403));
  }

  if (!checkRolesAccess(participant.role, ["owner"])) {
    return next(
      new AppError(
        "You can't perform such an operation with your current role",
        403
      )
    );
  }

  const photo = (await chat.getPictures({ where: { id: photoId } }))[0];

  if (!photo) {
    return next(new AppError("There is no such picture", 404));
  }

  const { publicId } = photo.dataValues;

  await deleteFile(publicId);

  await photo.destroy();

  res.status(200).json({ message: "Photo was deleted successfully" });
});
