const User = require('./models/user.models');
const ActivateToken = require('./models/activateToken.models');
const ResetToken = require('./models/resetToken.models');
const Conversation = require('./models/conversation.models');
const Participant = require('./models/participant.models');
const Message = require('./models/message.models');
const DeletedMessage = require('./models/deletedMessage.models');
const DeletedConversation = require('./models/deletedConversation.models');
const MessageReaction = require('./models/messageReaction.models');
const Attachment = require('./models/attachment.models');
const Picture = require('./models/picture.models');

User.hasOne(ActivateToken, { onDelete: 'cascade', foreignKey: 'userId' });
ActivateToken.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(ResetToken, { onDelete: 'cascade', foreignKey: 'userId' });
ResetToken.belongsTo(User, { foreignKey: 'userId' });

User.belongsToMany(Conversation, { through: Participant, foreignKey: 'userId' });
Conversation.belongsToMany(User, { through: Participant, foreignKey: 'conversationId' });

User.hasMany(Conversation, { onDelete: 'cascade', foreignKey: 'creatorId' });
Conversation.belongsTo(User, { foreignKey: 'creatorId' });

Conversation.hasMany(Message, { onDelete: 'cascade', foreignKey: 'conversationId' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId' });

User.hasMany(Message, { onDelete: 'cascade', foreignKey: 'senderId' });
Message.belongsTo(User, { foreignKey: 'senderId' });

Message.hasMany(Attachment, { onDelete: 'cascade', foreignKey: 'messageId' });
Attachment.belongsTo(Message, { foreignKey: 'messageId' });

User.belongsToMany(Conversation, { through: DeletedConversation, foreignKey: 'userId' });
Conversation.belongsToMany(User, {
  through: DeletedConversation,
  foreignKey: 'conversationId',
});

User.belongsToMany(Message, { through: DeletedMessage, foreignKey: 'userId' });
Message.belongsToMany(User, {
  through: DeletedMessage,
  foreignKey: 'messageId',
});

User.belongsToMany(User, {
  as: 'blocker',
  through: 'block_list',
  foreignKey: 'userId',
});
User.belongsToMany(User, {
  as: 'blocked',
  through: 'block_list',
  foreignKey: 'blockedUserId',
});

User.belongsToMany(User, { as: 'owner', through: 'user_contacts', foreignKey: 'userId' });
User.belongsToMany(User, { as: 'contact', through: 'user_contacts', foreignKey: 'contactId' });

Message.hasMany(MessageReaction, { onDelete: 'cascade', foreignKey: 'messageId' });
MessageReaction.belongsTo(Message, { foreignKey: 'messageId' });

User.hasMany(MessageReaction, { onDelete: 'cascade', foreignKey: 'userId' });
MessageReaction.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Picture, { onDelete: 'cascade', foreignKey: 'userId' });
Picture.belongsTo(User, { foreignKey: 'userId' });
