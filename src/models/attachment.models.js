const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/db.config');

const Attachment = sequelize.define('attachment', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  thumbUrl: {
    type: DataTypes.STRING,
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = Attachment;
