const { test, after, before, describe } = require('node:test')
const assert = require('node:assert')
const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const helper = require('./test_helper')
const api = supertest(app)

describe('when there is initially one user in db', () => {
  before(async () => {
    await helper.adminUser()
  })

  test('creation succeeds with a fresh username', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      username: 'mluukkai',
      name: 'Matti Luukkainen',
      password: 'salainen',
    }

    await api
      .post('/api/users')
      .send(newUser)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const usersAtEnd = await helper.usersInDb()
    assert.strictEqual(usersAtEnd.length, usersAtStart.length + 1)

    const usernames = usersAtEnd.map(u => u.username)
    assert(usernames.includes(newUser.username))
  })

  describe('with invalid data', () => {
    test('fails if username or pw are too short', async () => {
      const usersAtStart = await helper.usersInDb()

      const badPassword = {
        username: 'root',
        name: 'Superuser',
        password: '12',
      }

      const badUsername = {
        username: 'ha',
        name: 'Hehe',
        password: '12334'
      }

      let result = await api
        .post('/api/users')
        .send(badPassword)
        .expect(400)
        .expect('Content-Type', /application\/json/)
      let error_msg = result.body.error

      assert(error_msg.includes('Password must be at least 3 chars long'))

      result = await api
        .post('/api/users')
        .send(badUsername)
        .expect(400)
        .expect('Content-Type', /application\/json/)
      error_msg = result.body.error

      assert(error_msg.includes('shorter than the minimum allowed length (3)'))

      const usersAtEnd = await helper.usersInDb()
      assert.strictEqual(usersAtEnd.length, usersAtStart.length)
    })

    test('fails if username already taken', async () => {
      const usersAtStart = await helper.usersInDb()

      const newUser = {
        username: 'root',
        name: 'Superuser',
        password: 'salainen',
      }

      const result = await api
        .post('/api/users')
        .send(newUser)
        .expect(400)
        .expect('Content-Type', /application\/json/)

      const usersAtEnd = await helper.usersInDb()
      assert(result.body.error.includes('expected `username` to be unique'))

      assert.strictEqual(usersAtEnd.length, usersAtStart.length)
    })
  })
})

after(async () => {
  await mongoose.connection.close()
})
