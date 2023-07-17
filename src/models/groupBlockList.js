const { sequelize } = require('../db/db.config');

const GroupBlockList = sequelize.define('group_block_list', {});

module.exports = GroupBlockList;
