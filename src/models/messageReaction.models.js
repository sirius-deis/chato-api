const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/db.config');

const MessageReaction = sequelize.define('message_reaction', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  reaction: {
    type: DataTypes.CHAR(10),
    allowNull: false,
  },
});

module.exports = MessageReaction;
