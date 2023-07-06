const User = require('./models/user.models');
const ActivateToken = require('./models/activateToken.models');
const ResetToken = require('./models/resetToken.models');
const Conversation = require('./models/conversation.models');
const Participant = require('./models/participant.models');
const Message = require('./models/message.models');
const DeletedConversation = require('./models/deletedConversation.models');
const DeletedMessage = require('./models/deletedMessage.models');

User.hasOne(ActivateToken, { onDelete: 'cascade', foreignKey: 'userId' });
ActivateToken.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(ResetToken, { onDelete: 'cascade', foreignKey: 'userId' });
ResetToken.belongsTo(User, { foreignKey: 'userId' });

User.belongsToMany(Conversation, { through: Participant });
Conversation.belongsToMany(User, { through: Participant });

Conversation.hasMany(Message, { onDelete: 'cascade', foreignKey: 'conversationId' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId' });

User.hasMany(Message, { onDelete: 'cascade', foreignKey: 'senderId' });
Message.belongsTo(User, { foreignKey: 'senderId' });

User.hasMany(DeletedConversation, { onDelete: 'cascade', foreignKey: 'userId' });
DeletedConversation.belongsTo(User, { foreignKey: 'userId' });

Conversation.hasOne(DeletedConversation, { onDelete: 'cascade', foreignKey: 'conversationId' });
DeletedConversation.belongsTo(Conversation, { foreignKey: 'conversationId' });

User.hasMany(DeletedMessage, {
  onDelete: 'cascade',
  foreignKey: 'userId',
});
DeletedMessage.belongsTo(User, {
  foreignKey: 'userId',
});

Message.hasOne(DeletedMessage, { onDelete: 'cascade', foreignKey: 'messageId' });
DeletedMessage.belongsTo(Message, { foreignKey: 'messageId' });

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
