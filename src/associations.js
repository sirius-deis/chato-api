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
