const User = require('./models/user.models');
const ActivateToken = require('./models/activateToken.models');
const ResetToken = require('./models/resetToken.models');
const Conversation = require('./models/conversation.models');
const Participant = require('./models/participant.models');

User.hasOne(ActivateToken, { onDelete: 'cascade', foreignKey: 'user_id' });
ActivateToken.belongsTo(User, { foreignKey: 'user_id' });

User.hasOne(ResetToken, { onDelete: 'cascade', foreignKey: 'user_id' });
ResetToken.belongsTo(User, { foreignKey: 'user_id' });

Conversation.belongsToMany(Participant, {
  foreignKey: 'conversation_id',
  through: 'participant_in_conversation',
});
Participant.belongsToMany(Conversation, {
  foreignKey: 'participant_id',
  through: 'participant_in_conversation',
});

User.hasMany(Conversation, { foreignKey: 'creator_id' });
Conversation.belongsTo(User, { foreignKey: 'creator_id' });

User.hasMany(Participant, { foreignKey: 'user_id' });
Participant.belongsTo(User, { foreignKey: 'user_id' });
