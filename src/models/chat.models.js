const { DataTypes } = require("sequelize");
const { sequelize } = require("../db/db.config");

const Chat = sequelize.define("chat", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(40),
  },
  type: {
    type: DataTypes.ENUM("private", "group", "channel"),
    defaultValue: "private",
    allowNull: false,
  },
});

module.exports = Chat;
