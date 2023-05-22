const User = require('./models/user.models');
const ActivateToken = require('./models/activateToken.models');
const ResetToken = require('./models/resetToken.models');

User.hasOne(ActivateToken, { onDelete: 'cascade', foreignKey: 'userId' });
ActivateToken.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(ResetToken, { onDelete: 'cascade', foreignKey: 'userId' });
ResetToken.belongsTo(User, { foreignKey: 'userId' });
