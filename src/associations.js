const User = require('./models/user.models');
const ActivateToken = require('./models/activateToken.models');
const ResetToken = require('./models/resetToken.models');
const Conversation = require('./models/conversation.models');
const Participant = require('./models/participant.models');
const Message = require('./models/message.models');
const DeletedConversation = require('./models/deletedConversation.models');
const DeletedMessage = require('./models/deletedMessage.models');
const BlockList = require('./models/blockList.models');

User.hasOne(ActivateToken, { onDelete: 'cascade', foreignKey: 'user_id' });
ActivateToken.belongsTo(User, { foreignKey: 'user_id' });

User.hasOne(ResetToken, { onDelete: 'cascade', foreignKey: 'user_id' });
ResetToken.belongsTo(User, { foreignKey: 'user_id' });

Conversation.belongsToMany(Participant, {
  through: 'participants_in_conversation',
  foreignKey: 'conversation_id',
});
Participant.belongsToMany(Conversation, {
  through: 'participants_in_conversation',
  foreignKey: 'participant_id',
});

User.hasMany(Conversation, { foreignKey: 'creator_id' });
Conversation.belongsTo(User, { foreignKey: 'creator_id' });

User.hasOne(Participant, { foreignKey: 'user_id' });
Participant.belongsTo(User, { foreignKey: 'user_id' });

Conversation.hasMany(Message, { onDelete: 'cascade', foreignKey: 'conversation_id' });
Message.belongsTo(Conversation, { foreignKey: 'conversation_id' });

Participant.hasMany(Message, { onDelete: 'cascade', foreignKey: 'sender_id' });
Message.belongsTo(Participant, { foreignKey: 'sender_id' });

User.hasMany(DeletedConversation, { onDelete: 'cascade', foreignKey: 'user_id' });
DeletedConversation.belongsTo(User, { foreignKey: 'user_id' });

Conversation.hasOne(DeletedConversation, { onDelete: 'cascade', foreignKey: 'conversation_id' });
DeletedConversation.belongsTo(Conversation, { foreignKey: 'conversation_id' });

User.hasMany(DeletedMessage, {
  onDelete: 'cascade',
  foreignKey: 'user_id',
});
DeletedMessage.belongsTo(User, {
  foreignKey: 'user_id',
});

Message.hasOne(DeletedMessage, { onDelete: 'cascade', foreignKey: 'message_id' });
DeletedMessage.belongsTo(Message, { foreignKey: 'message_id' });

User.hasOne(BlockList, { onDelete: 'cascade', foreignKey: 'user_id' });
BlockList.belongsTo(User, { foreignKey: 'user_id' });
