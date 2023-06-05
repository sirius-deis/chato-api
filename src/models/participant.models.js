const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/db.config');

const Participant = sequelize.define('participants', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('user', 'admin', 'owner'),
  },
});

module.exports = Participant;
