const Message = require("../models/message.models");
const DeletedMessage = require("../models/deletedMessage.models");
const { Sequelize, sequelize } = require("../db/db.config");
const { resizeAndSave } = require("../api/fileUpload");

exports.createMessage = async ({
  chatId,
  senderId,
  message,
  repliedMessageId,
  files,
  forwardMessageId,
  type = "text",
}) => {
  if (!message && forwardMessageId) {
    await Message.create({
      chatId,
      senderId,
      forwardMessageId,
    });
  } else {
    return await sequelize.transaction(async () => {
      const messageObj = await Message.create({
        chatId,
        senderId,
        message,
        repliedMessageId,
        messageType: type,
      });
      if (files) {
        await Promise.all(
          files.map(async (file) => {
            const cldResponse = await resizeAndSave(
              file.buffer,
              { width: 1024, height: 1024 },
              "png",
              "messages"
            );
            return messageObj.addAttachment({
              fileUrl: cldResponse.secure_url,
              publicId: cldResponse.public_id,
            });
          })
        );
      }
      return messageObj;
    });
  }
};

exports.findOneDeletedMessage = async (userId, messageId) =>
  await DeletedMessage.findOne({
    where: Sequelize.and(
      {
        userId,
      },
      {
        messageId,
      }
    ),
  });

//TODO:
exports.addAttachments = async (foundMessage, files) =>
  await sequelize.transaction(async () => {
    await foundMessage.removeAttachments();
    if (files) {
      await Promise.all(
        files.map(async (file) => {
          const path = "";
          await resizeAndSave(
            file.buffer,
            { width: 1024, height: 1024 },
            "png",
            path
          );
          return Message.addAttachment({ fileUrl: path });
        })
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
      }
    ),
  });

  const deletedIds = deletedMessages.map((message) =>
    message.dataValues.messageId.toString()
  );

  return messages.filter(
    (message) => !deletedIds.includes(message.dataValues.id.toString())
  );
};

exports.findOneMessage = async (id, chatId, ...rest) =>
  await Message.findOne({
    where: Sequelize.and({ id }, { chatId }, ...rest),
  });
