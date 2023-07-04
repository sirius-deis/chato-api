const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/db.config');

const Attachment = sequelize.define('message', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'file_url',
  },
});

module.exports = Attachment;
