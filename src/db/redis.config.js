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

const getValue = async (key) => JSON.parse(await client.get(key));

const setValue = async (key, value) => await client.set(key, JSON.stringify(value));

module.exports = {
  redisConnect,
  redisDisconnect,
  getValue,
  setValue,
};
