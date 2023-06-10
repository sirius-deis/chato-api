const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/db.config');

const BlockList = sequelize.define('block-list', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
});

module.exports = BlockList;
