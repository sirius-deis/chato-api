const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/db.config');

const ActivateToken = sequelize.define('activate_tokens', {
  token: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: new Date(),
    field: 'created_at',
  },
});

module.exports = ActivateToken;
