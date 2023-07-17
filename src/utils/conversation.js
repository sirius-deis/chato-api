const User = require('../models/user.models');
const DeletedConversation = require('../models/deletedConversation.models');
const Chat = require('../models/chat.models');
const { sequelize } = require('../db/db.config');

const findIfConversationExists = (arr1, arr2) => {
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

  if (blockList.find((blockedUser) => blockedUser.dataValues.id.toString() === userId)) {
    return true;
  }
};

exports.findConversationId = async (user, secondUser) => {
  const conversationsArr = await Promise.all([user.getChats(), secondUser.getChats()]);

  const conversationId = findIfConversationExists(...conversationsArr);

  return conversationId;
};

exports.checkIfConversationWasDeletedAndRestoreIfYes = async (userId, chatId) => {
  const deletedConversation = await DeletedConversation.findOne({
    where: {
      chatId,
      userId,
    },
  });

  if (!deletedConversation) {
    return false;
  }
  await deletedConversation.destroy();
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
    if (type === 'group') {
      creatorRole = 'owner';
    }
    chat.addUser(userId, { through: { role: creatorRole } });
    if (receiverId) {
      chat.addUser(receiverId);
    }
    await chat.save();
    return chat;
  });

exports.findChat = async (chatId, includeModel) =>
  await Chat.findByPk(chatId, includeModel && { include: { model: includeModel } });
