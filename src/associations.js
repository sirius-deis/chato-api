const User = require('./models/user.models');
const ActivateToken = require('./models/activateToken.models');

User.hasOne(ActivateToken, { onDelete: 'cascade', foreignKey: 'userId' });
ActivateToken.belongsTo(User, { foreignKey: 'userId' });
