// eslint-disable-next-line node/no-unpublished-require
const request = require('supertest');
const app = require('../app');
const { sequelize } = require('../db/db.config');
const { redisConnect, redisDisconnect } = require('../db/redis.config');
const User = require('../models/user.models');

const baseUrl = '/api/v1/messages';

describe('/messages route', () => {
  let token1;
  beforeAll(async () => {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
    await redisConnect();
    await User.create({
      email: 'test1@test.com',
      password: 'password',
      firstName: 'test1',
      lastName: 'test1',
      bio: 'test1',
      isActive: true,
    });
    const res = await request(app)
      .post('/api/v1/users/login')
      .send({ email: 'test1@test.com', password: 'password' });
    token1 = res.body.token;
  });
  afterAll(async () => {
    await sequelize.close();
    await redisDisconnect();
  });
});
