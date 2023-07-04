// eslint-disable-next-line node/no-unpublished-require
const request = require('supertest');
const app = require('../app');
const { sequelize } = require('../db/db.config');
const { redisConnect, redisDisconnect } = require('../db/redis.config');
const User = require('../models/user.models');

const baseUrl = '/api/v1/conversations';

describe('/conversations route', () => {
  let token;
  beforeAll(async () => {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
    await redisConnect();
    const user = await User.create({
      email: 'test1@test.com',
      password: 'password',
      firstName: 'test1',
      lastName: 'test1',
      bio: 'test1',
      isActive: true,
    });
    await User.create({
      email: 'test2@test.com',
      password: 'password',
      firstName: 'test2',
      lastName: 'test2',
      bio: 'test2',
      isActive: true,
    });
    const res = await request(app)
      .post('/api/v1/users/login')
      .send({ email: 'test1@test.com', password: 'password' });
    token = res.body.token;
  });

  afterAll(async () => {
    await sequelize.close();
    await redisDisconnect();
  });
  describe('/ route for creating conversation', () => {
    it('should return 401 as user is not logged in', (done) => {
      request(app)
        .post(`/api/v1/users/${1}/conversations`)
        .set('Accept', 'application/json')
        .send({})
        .expect(401)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('Sign in before accessing this route');
        })
        .end(done);
    });
    it('should return 400 as user is trying to begin conversation with himself', (done) => {
      request(app)
        .post(`/api/v1/users/${1}/conversations`)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .send()
        .expect(400)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe("You can't start conversation with yourself");
        })
        .end(done);
    });
    it('should return 404 as there is not such user', (done) => {
      request(app)
        .post(`/api/v1/users/${1000}/conversations`)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .send()
        .expect(404)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('There is no user with such id');
        })
        .end(done);
    });
    it('should return 201 and create a conversation', (done) => {
      request(app)
        .post(`/api/v1/users/${2}/conversations`)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .send()
        .expect(201)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('Conversation was created successfully');
        })
        .end(done);
    });
    it('should return 400 as conversation with this user already exists', (done) => {
      request(app)
        .post(`/api/v1/users/${2}/conversations`)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .send()
        .expect(400)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('Conversation with this user is already exists');
        })
        .end(done);
    });
  });
});
