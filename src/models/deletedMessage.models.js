const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/db.config');

const DeletedMessage = sequelize.define('deleted_messages', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
});

module.exports = DeletedMessage;
