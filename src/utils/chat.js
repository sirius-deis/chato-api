const User = require("../models/user.models");
const DeletedChat = require("../models/deletedChat.models");
const Chat = require("../models/chat.models");
const { sequelize } = require("../db/db.config");

const findIfChatExists = (arr1, arr2) => {
  const map = {};
  for (let i = 0; i < arr1.length; i += 1) {
    map[arr1[i].dataValues.id] = true;
  }

  for (let i = 0; i < arr2.length; i += 1) {
    if (map[arr2[i].dataValues.id]) {
      return arr2[i].dataValues.id;
    }
  }

  return null;
};

exports.isUserIdsTheSame = (userId, secondUserId) => {
  if (userId === secondUserId) {
    return true;
  }
};

exports.getReceiverIfExists = async (secondUserId) => {
  const receiver = await User.findByPk(secondUserId);

  if (!receiver) {
    return null;
  }
  return receiver;
};

exports.isUserBlocked = async (userId, secondUser) => {
  const blockList = await secondUser.getBlocker();

  if (
    blockList.find(
      (blockedUser) => blockedUser.dataValues.id.toString() === userId
    )
  ) {
    return true;
  }
};

exports.findChatId = async (user, secondUser) => {
  const conversationsArr = await Promise.all([
    user.getChats(),
    secondUser.getChats(),
  ]);

  const conversationId = findIfChatExists(...conversationsArr);

  return conversationId;
};

exports.checkIfChatWasDeletedAndRestoreIfYes = async (userId, chatId) => {
  const deletedChat = await DeletedChat.findOne({
    where: {
      chatId,
      userId,
    },
  });

  if (!deletedChat) {
    return false;
  }
  await deletedChat.destroy();
  return true;
};

exports.createChat = async (userId, receiverId, { title, type } = {}) =>
  await sequelize.transaction(async () => {
    const chat = await Chat.create({
      type,
      creatorId: userId,
      title,
    });
    let creatorRole;
    if (type === "group") {
      creatorRole = "owner";
    }
    chat.addUser(userId, { through: { role: creatorRole } });
    if (receiverId) {
      chat.addUser(receiverId);
    }
    await chat.save();
    return chat;
  });

exports.findChat = async (chatId, includeModel) =>
  await Chat.findByPk(
    chatId,
    includeModel && { include: { model: includeModel } }
  );

exports.getUserRole = (participants, userId) => {
  return participants.find(
    (participant) => participant.dataValues.id === userId
  ).dataValues.participants.dataValues.role;
};
