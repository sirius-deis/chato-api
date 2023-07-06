const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/db.config');

const Message = sequelize.define('messages', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  messageType: {
    type: DataTypes.ENUM('text', 'image', 'audio', 'video', 'system'),
    defaultValue: 'text',
  },
  message: {
    type: DataTypes.TEXT,
  },
  repliedMessageId: {
    type: DataTypes.INTEGER,
  },
  isEdited: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: new Date(),
  },
});

module.exports = Message;
