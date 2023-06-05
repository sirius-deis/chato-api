const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/db.config');

const Conversation = sequelize.define('conversations', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(40),
  },
  type: {
    type: DataTypes.ENUM('private', 'groupe'),
    allowNull: false,
  },
});

module.exports = Conversation;
