exports.isUserBlockedByAnotherUser = async (userId, anotherUser) => {
  const blockList = await anotherUser.getBlocker();

  if (blockList.find((blockedUser) => blockedUser.dataValues.id === userId)) {
    return true;
  }
};
