const Message = require('../models/message.models');
const DeletedMessage = require('../models/deletedMessage.models');
const { Sequelize, sequelize } = require('../db/db.config');
const { resizeAndSave } = require('../api/fileUpload');

exports.createMessage = async (chatId, senderId, message, repliedMessageId, files) =>
  await sequelize.transaction(async () => {
    const messageObj = await Message.create({
      chatId,
      senderId,
      message,
      repliedMessageId,
    });
    //TODO: add cloud storage and store attachments there
    if (files) {
      await Promise.all(
        files.map(async (file) => {
          const path = '';
          await resizeAndSave(file.buffer, { width: 1024, height: 1024 }, 'png', path);
          return messageObj.addAttachment({ fileUrl: path });
        }),
      );
    }
    return messageObj;
  });

exports.findOneDeletedMessage = async (userId, messageId) =>
  await DeletedMessage.findOne({
    where: Sequelize.and(
      {
        userId,
      },
      {
        messageId,
      },
    ),
  });

exports.addAttachments = async (foundMessage, files) =>
  await sequelize.transaction(async () => {
    await foundMessage.removeAttachments();
    if (files) {
      await Promise.all(
        files.map(async (file) => {
          const path = '';
          await resizeAndSave(file.buffer, { width: 1024, height: 1024 }, 'png', path);
          return Message.addAttachment({ fileUrl: path });
        }),
      );
    }
    await foundMessage.save();
  });

exports.filterDeletedMessages = async (userId, ...messages) => {
  const deletedMessages = await DeletedMessage.findAll({
    where: Sequelize.and(
      {
        userId: userId,
      },
      {
        messageId: messages.map((message) => message.dataValues.id.toString()),
      },
    ),
  });

  const deletedIds = deletedMessages.map((message) => message.dataValues.messageId.toString());

  return messages.filter((message) => !deletedIds.includes(message.dataValues.id.toString()));
};

exports.findOneMessage = async (id, chatId, ...rest) =>
  await Message.findOne({
    where: Sequelize.and({ id }, { chatId }, ...rest),
  });
