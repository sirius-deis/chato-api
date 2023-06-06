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
    allowNull: false,
    field: 'message_type',
  },
  message: {
    type: DataTypes.TEXT,
  },
  repliedMessageId: {
    type: DataTypes.INTEGER,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: new Date(),
    field: 'created_at',
  },
  isEdited: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_edited',
  },
});

module.exports = Message;
