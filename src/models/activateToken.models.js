const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/db.config');

const ActivateToken = sequelize.define('ActivateToken', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    token: {
        type: DataTypes.STRING(32),
        allowNull: false,
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: new Date(),
    },
});

module.exports = ActivateToken;
