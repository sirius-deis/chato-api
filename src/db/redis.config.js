const logger = require('../api/logger');
const { createClient } = require('redis');

const client = createClient();

client.on('connect', () => logger.info('Redis client connected.'));
client.on('error', (error) => logger.error(error));

const redisConnect = async () => {
  await client.connect();
};

const redisDisconnect = async () => {
  await client.disconnect();
};

module.exports = {
  redisConnect,
  redisDisconnect,
};
