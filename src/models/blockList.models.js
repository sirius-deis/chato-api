const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/db.config');

const BlockList = sequelize.define('block_list', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  blockedUsers: {
    type: DataTypes.JSON({
      type: DataTypes.INTEGER,
      references: {
        model: 'participants',
        key: 'id',
      },
      allowNull: false,
    }),
    field: 'blocked_users',
  },
});

module.exports = BlockList;
