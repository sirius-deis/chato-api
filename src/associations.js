const User = require("./models/user.models");
const ActivateToken = require("./models/activateToken.models");
const ResetToken = require("./models/resetToken.models");
const Chat = require("./models/chat.models");
const Participant = require("./models/participant.models");
const Message = require("./models/message.models");
const DeletedMessage = require("./models/deletedMessage.models");
const DeletedConversation = require("./models/deletedConversation.models");
const MessageReaction = require("./models/messageReaction.models");
const Attachment = require("./models/attachment.models");
const Picture = require("./models/picture.models");
const GroupBlockList = require("./models/groupBlockList");

User.hasOne(ActivateToken, { onDelete: "cascade", foreignKey: "userId" });
ActivateToken.belongsTo(User, { foreignKey: "userId" });

User.hasOne(ResetToken, { onDelete: "cascade", foreignKey: "userId" });
ResetToken.belongsTo(User, { foreignKey: "userId" });

User.belongsToMany(Chat, { through: Participant, foreignKey: "userId" });
Chat.belongsToMany(User, { through: Participant, foreignKey: "chatId" });

User.hasMany(Chat, { onDelete: "cascade", foreignKey: "creatorId" });
Chat.belongsTo(User, { foreignKey: "creatorId" });

Chat.hasMany(Message, { onDelete: "cascade", foreignKey: "chatId" });
Message.belongsTo(Chat, { foreignKey: "chatId" });

User.hasMany(Message, { onDelete: "cascade", foreignKey: "senderId" });
Message.belongsTo(User, { foreignKey: "senderId" });

Message.hasMany(Attachment, { onDelete: "cascade", foreignKey: "messageId" });
Attachment.belongsTo(Message, { foreignKey: "messageId" });

User.belongsToMany(Chat, {
  through: DeletedConversation,
  foreignKey: "userId",
});
Chat.belongsToMany(User, {
  through: DeletedConversation,
  foreignKey: "chatId",
});

User.belongsToMany(Message, { through: DeletedMessage, foreignKey: "userId" });
Message.belongsToMany(User, {
  through: DeletedMessage,
  foreignKey: "messageId",
});

User.belongsToMany(User, {
  as: "blocker",
  through: "block_list",
  foreignKey: "userId",
});
User.belongsToMany(User, {
  as: "blocked",
  through: "block_list",
  foreignKey: "blockedUserId",
});

User.belongsToMany(User, {
  as: "owner",
  through: "user_contacts",
  foreignKey: "userId",
});
User.belongsToMany(User, {
  as: "contact",
  through: "user_contacts",
  foreignKey: "contactId",
});

Message.hasMany(MessageReaction, {
  onDelete: "cascade",
  foreignKey: "messageId",
});
MessageReaction.belongsTo(Message, { foreignKey: "messageId" });

User.hasMany(MessageReaction, { onDelete: "cascade", foreignKey: "userId" });
MessageReaction.belongsTo(User, { foreignKey: "userId" });

User.hasMany(Picture, { onDelete: "cascade", foreignKey: "userId" });
Picture.belongsTo(User, { foreignKey: "userId" });

Chat.belongsToMany(User, { through: GroupBlockList, foreignKey: "userId" });
User.belongsToMany(Chat, { through: GroupBlockList, foreignKey: "chatId" });

User.hasOne(Picture, { onDelete: "cascade", foreignKey: "userId" });
Picture.belongsTo(User, { foreignKey: "userId" });

Picture.hasOne(User, { onDelete: "cascade", foreignKey: "profilePictureId" });
User.belongsTo(Picture, { foreignKey: "profilePictureId" });
