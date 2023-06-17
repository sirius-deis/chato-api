// eslint-disable-next-line node/no-unpublished-require
const request = require('supertest');
const app = require('../app');
const sequelize = require('./db.config');

const baseUrl = '/api/v1/users/';

describe('/users route', () => {
  beforeAll(async () => {
    await sequelize.authenticate();
    await sequelize.sync();
  });

  afterAll(async () => {
    await sequelize.close();
  });
  describe('/signup route ', () => {
    it('should return 400 as email body values are empty', (done) => {
      request(app)
        .post(`${baseUrl}signup`)
        .type('json')
        .set('Accept', 'application/json')
        .send({})
        .expect(400)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toEqual([
            'Provide valid email',
            "Field: password can't be empty",
            "Field: passwordConfirm can't be empty",
            "Field: password can't be shorter than 4 length",
            "Field: passwordConfirm can't be shorter than 4 length",
          ]);
        })
        .end(done);
    });
  });
});
