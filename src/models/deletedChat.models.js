const { DataTypes } = require("sequelize");
const { sequelize } = require("../db/db.config");

const DeletedChat = sequelize.define("deleted_conversations", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
});

module.exports = DeletedChat;
