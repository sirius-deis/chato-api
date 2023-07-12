const User = require('../models/user.models');

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

exports.isUserIdsTheSame = (userId, receiverId) => {
  if (userId === receiverId) {
    return true;
  }
};

exports.getReceiverIfExists = async (receiverId) => {
  const receiver = await User.findByPk(receiverId);

  if (!receiver) {
    return false;
  }
  return receiver;
};

exports.isUserBlocked = async (userId, receiver) => {
  const blockList = await receiver.getBlocker();

  if (blockList.find((blockedUser) => blockedUser.dataValues.id.toString() === userId)) {
    return true;
  }
};

exports.findConversationId = async (user, receiver) => {
  const conversationsArr = await Promise.all([
    user.getConversations(),
    receiver.getConversations(),
  ]);

  const conversationId = findIfConversationExists(...conversationsArr);

  return conversationId;
};
