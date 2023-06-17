const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/db.config');

const Device = sequelize.define('device', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  device_id: {
    type: DataTypes.STRING(120),
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('APPLE', 'ANDROID'),
  },
  device_token: {
    type: DataTypes.STRING(120),
  },
});

module.exports = Device;
