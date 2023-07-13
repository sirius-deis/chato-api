const User = require('../models/user.models');
const DeletedConversation = require('../models/deletedConversation.models');
const Conversation = require('../models/conversation.models');
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

  return false;
};

exports.isUserIdsTheSame = (userId, userToInviteId) => {
  if (userId === userToInviteId) {
    return true;
  }
};

exports.getReceiverIfExists = async (userToInviteId) => {
  const receiver = await User.findByPk(userToInviteId);

  if (!receiver) {
    return false;
  }
  return receiver;
};

exports.isUserBlocked = async (userId, userToInvite) => {
  const blockList = await userToInvite.getBlocker();

  if (blockList.find((blockedUser) => blockedUser.dataValues.id.toString() === userId)) {
    return true;
  }
};

exports.findConversationId = async (user, userToInvite) => {
  const conversationsArr = await Promise.all([
    user.getConversations(),
    userToInvite.getConversations(),
  ]);

  const conversationId = findIfConversationExists(...conversationsArr);

  return conversationId;
};

exports.checkIfConversationWasDeletedAndRestoreIfYes = async (userId, conversationId) => {
  const deletedConversation = await DeletedConversation.findOne({
    where: {
      conversationId,
      userId,
    },
  });

  if (!deletedConversation) {
    return false;
  }
  await deletedConversation.destroy();
  return true;
};

exports.createConversation = async (userId, userToInviteId, { title, type = 'private' } = {}) => {
  await sequelize.transaction(async () => {
    const conversation = await Conversation.create({
      type,
      creatorId: userId,
      title,
    });
    let creatorRole;
    if (!userToInviteId) {
      creatorRole = 'owner';
    }
    conversation.addUser(userId, { through: { role: creatorRole } });
    if (userToInviteId) {
      conversation.addUser(userToInviteId);
    }
    await conversation.save();
  });
};
