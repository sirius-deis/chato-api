const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/db.config');

const Access = sequelize.define('access', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  token: {
    type: DataTypes.STRING(60),
  },
});

module.exports = Access;
