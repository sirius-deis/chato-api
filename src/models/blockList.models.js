const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/db.config');
const Participant = require('./participant.models');

const BlockList = sequelize.define('block_list', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  blockedUsers: {
    type: DataTypes.ARRAY({
      type: DataTypes.INTEGER,
      reference: {
        model: Participant,
        key: 'id',
      },
    }),
    field: 'blocked_users',
  },
});

module.exports = BlockList;
