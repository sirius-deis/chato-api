const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/db.config');

const Participant = sequelize.define('participants', {
  role: {
    type: DataTypes.ENUM('user', 'admin', 'owner'),
    defaultValue: 'user',
  },
});

module.exports = Participant;
