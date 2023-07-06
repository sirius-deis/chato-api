// eslint-disable-next-line node/no-unpublished-require
const request = require('supertest');
const app = require('../app');
const { sequelize } = require('../db/db.config');
const { redisConnect, redisDisconnect } = require('../db/redis.config');
const User = require('../models/user.models');

const baseUrl = '/api/v1/conversations';

describe('/conversations route', () => {
  let token1;
  let token3;
  let token4;
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
    await User.create({
      email: 'test2@test.com',
      password: 'password',
      firstName: 'test2',
      lastName: 'test2',
      bio: 'test2',
      isActive: true,
    });
    await User.create({
      email: 'test3@test.com',
      password: 'password',
      firstName: 'test3',
      lastName: 'test3',
      bio: 'test3',
      isActive: true,
    });
    await User.create({
      email: 'test4@test.com',
      password: 'password',
      firstName: 'test3',
      lastName: 'test3',
      bio: 'test3',
      isActive: true,
    });
    const res = await request(app)
      .post('/api/v1/users/login')
      .send({ email: 'test1@test.com', password: 'password' });
    token1 = res.body.token;
    const res2 = await request(app)
      .post('/api/v1/users/login')
      .send({ email: 'test3@test.com', password: 'password' });
    token3 = res2.body.token;
    const res3 = await request(app)
      .post('/api/v1/users/login')
      .send({ email: 'test4@test.com', password: 'password' });
    token4 = res3.body.token;
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
        .set('Authorization', `Bearer ${token1}`)
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
        .set('Authorization', `Bearer ${token1}`)
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
        .set('Authorization', `Bearer ${token1}`)
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
        .set('Authorization', `Bearer ${token1}`)
        .send()
        .expect(400)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('Conversation with this user is already exists');
        })
        .end(done);
    });
    it('should return 201 and create a conversation', (done) => {
      request(app)
        .post(`/api/v1/users/${2}/conversations`)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token3}`)
        .send()
        .expect(201)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('Conversation was created successfully');
        })
        .end(done);
    });
  });
  describe('/ route for getting all conversations', () => {
    it('should return 401 there was no token provided', (done) => {
      request(app)
        .get(baseUrl)
        .type('json')
        .set('Accept', 'application/json')
        .send()
        .expect(401)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('Sign in before accessing this route');
        })
        .end(done);
    });
    it('should return 200 and empty array of conversations as user does not participate in any', (done) => {
      request(app)
        .get(baseUrl)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token4}`)
        .send()
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe("This user doesn't participate in any conversations");
          expect(res.body.data.conversations).toEqual([]);
        })
        .end(done);
    });
    it('should return 200 and return list of conversations', (done) => {
      request(app)
        .get(baseUrl)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token1}`)
        .send()
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('Conversations were found');
          expect(res.body.data.conversations.length).toBe(1);
          expect(res.body.data.conversations[0].creator_id).toBe(1);
        })
        .end(done);
    });
  });
  describe.skip('/:conversationId delete route', () => {
    it('should return 401 as there was no token provided', (done) => {
      request(app)
        .delete(`${baseUrl}/${1}`)
        .type('json')
        .send()
        .expect(401)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('Sign in before accessing this route');
        })
        .end(done);
    });
    it('should return 404 as there is no conversation for provided id', (done) => {
      request(app)
        .delete(`${baseUrl}/${1000}`)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token1}`)
        .send()
        .expect(404)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('There is no such conversation');
        })
        .end(done);
    });
    it('should return 401 as there is no conversation for this user', (done) => {
      request(app)
        .delete(`${baseUrl}/${2}`)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token1}`)
        .send()
        .expect(401)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('There is no such conversation for selected user');
        })
        .end(done);
    });
    it('should return 204 and delete conversation', (done) => {
      request(app)
        .delete(`${baseUrl}/${1}`)
        .type('json')
        .set('Authorization', `Bearer ${token1}`)
        .send()
        .expect(204)
        .end(done);
    });
    it('should return 400 as conversation with provided id for current user is already deleted', (done) => {
      request(app)
        .delete(`${baseUrl}/${1}`)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token1}`)
        .send()
        .expect(400)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('This conversation is already deleted');
        })
        .end(done);
    });
  });
});
