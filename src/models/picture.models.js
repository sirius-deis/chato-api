const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/db.config');

const Picture = sequelize.define('pictures', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  publicId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = Picture;
