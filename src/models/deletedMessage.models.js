const { sequelize } = require('../db/db.config');

const DeletedMessage = sequelize.define('deleted_messages', {});

module.exports = DeletedMessage;
