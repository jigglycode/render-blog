const { test, after, beforeEach, before, describe } = require('node:test')
const assert = require('node:assert')
const Blog = require('../models/blog')
const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const helper = require('./test_helper')
const api = supertest(app)

describe('when there are blogs in DB', () => {
  let user
  before(async () => {
    user = await helper.adminUser() // creates new admin user
  })

  beforeEach(async () => {
    await Blog.deleteMany({})
    const blogs = await helper.userBlogs(user) // adds new user as blog owner
    await Blog.insertMany(blogs)
  })

  test('blogs are returned as json', async () => {
    await api.get('/api/blogs')
      .expect(200)
      .expect('Content-Type', /application\/json/)
  })

  test('blogs have a unique identifier property named id', async () => {
    const blogs = await helper.blogsInDb()
    const keys = Object.keys(blogs[0])

    assert(keys.includes('id') && !keys.includes('_id'))
  })

  describe('viewing a specific blog', () => {
    let blogToView
    let result

    before(async() => {
      const blogs = await helper.blogsInDb()
      blogToView = blogs[0]
      result = await api
        .get(`/api/blogs/${blogToView.id}`)
    })

    test('succeeds with a valid id', () => {
      assert.strictEqual(result.status, 200)
      assert(result.header['content-type'].includes('application/json'))
    })

    test('shows user data', () => {
      assert.deepStrictEqual(result.body.user, blogToView.user.id)
    })
  })

  describe('with token authentication', () => {
    let token
    before(async () => {
      const resp = await api
        .post('/api/login')
        .send({ username: user.username, password: 'sekret'})

      token = resp.body.token
    })

    describe('adding a blog', () => {
      const newBlog = {
        title: 'new blog',
        author: 'Hehe Haha',
        url: 'meow.com',
        likes: 1,
      }

      test('succeeds with valid data', async () => {
        await api
          .post('/api/blogs')
          .set('Authorization', `Bearer ${token}`)
          .send(newBlog)
          .expect(201)
          .expect('Content-Type', /application\/json/)

        const blogs = await helper.blogsInDb()
        assert.strictEqual(blogs.length, helper.initialBlogs.length + 1)

        const titles = blogs.map(r => r.title)
        assert(titles.includes('new blog'))
      })

      test('if likes are missing, defaults to 0', async () => {
        delete newBlog['likes']

        const result = await api
          .post('/api/blogs')
          .set('Authorization', `Bearer ${token}`)
          .send(newBlog)
          .expect(201)
          .expect('Content-Type', /application\/json/)

        assert.strictEqual(result.body.likes, 0)
      })

      test('fails with status code 400 if title or url are missing', async () => {
        const missingTitle = {
          author: 'Hehe',
          url: 'haha.com'
        }

        const missingUrl = {
          author: 'Hehe',
          title: 'Haha'
        }

        let resp = await api
          .post('/api/blogs')
          .set('Authorization', `Bearer ${token}`)
          .send(missingTitle)
          .expect(400)
        let error_msg = resp.body.error

        assert(error_msg.includes("Blog validation failed: " +
                                    "title: Path `title` is required"))

        resp = await api
          .post('/api/blogs')
          .set('Authorization', `Bearer ${token}`)
          .send(missingUrl)
          .expect(400)
        error_msg = resp.body.error

        assert(error_msg.includes("Blog validation failed: " +
                                    "url: Path `url` is required"))
      })

      test('fails if authentication token is not passed in', async () => {
        const resp = await api
          .post('/api/blogs')
          .send(newBlog)
          .expect(401)

        assert.strictEqual(resp.body.error, 'token missing or invalid')
      })
    })

    describe('removing a blog', () => {
      let blogToDel
      beforeEach(async () => {
        const blogs = await helper.blogsInDb()
        blogToDel = blogs[0]
      })

      test('succeeds with valid id', async () => {
        await api
          .delete(`/api/blogs/${blogToDel.id}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(204)

        const updatedBlogs = await helper.blogsInDb()
        assert.strictEqual(updatedBlogs.length, helper.initialBlogs.length - 1)

        const titles = updatedBlogs.map(b => b.title)
        assert(!titles.includes(blogToDel.title))
      })

      test('fails with status code 400 if invalid id', async () => {
        const invalidId = '1234508'
        const resp = await api
          .delete(`/api/blogs/${invalidId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(400)

          assert.strictEqual(resp.body.error, 'malformatted id')
      })

      test('fails if authentication token is not passed in', async () => {
        const resp = await api
          .delete(`/api/blogs/${blogToDel.id}`)
          .expect(401)

        assert.strictEqual(resp.body.error, 'token missing or invalid')
      })
    })
  })

  describe('updating a blog', () => {
    describe('with valid id', () => {
      let blogToUpdate, updatedBlog
      const authorName = 'Hehe Ha'
      before(async() => {
        const initialBlogs = await helper.blogsInDb()
        blogToUpdate = initialBlogs[0]
        const updatedLikes = blogToUpdate.likes + 1
        const response = await api
          .put(`/api/blogs/${blogToUpdate.id}`)
          .send({ likes: updatedLikes, author: authorName })
          .expect(200)

        updatedBlog = response.body
      })

      test('updates likes', () => {
        assert.strictEqual(updatedBlog.likes, blogToUpdate.likes + 1)
      })

      test('does not update other fields', () => {
        assert(updatedBlog.author!==authorName)
      })

      test('blog count does not increase', async () => {
        const updatedBlogs = await helper.blogsInDb()
        assert.strictEqual(helper.initialBlogs.length, updatedBlogs.length)
      })
    })

    test('fails with status code 400 if invalid id', async () => {
      const invalidId = '1234508'
      const blogs = await helper.blogsInDb()
      const blogToUpdate = blogs[0]
      blogToUpdate.likes = blogToUpdate.likes + 1

      await api
        .put(`/api/blogs/${invalidId}`)
        .send(blogToUpdate)
        .expect(400)

      const updatedBlogs = await helper.blogsInDb()
      const blog = updatedBlogs[0]

      assert.strictEqual(blog.id, blogToUpdate.id)
      assert(blog.likes != blogToUpdate.likes)
    })
  })
})

after(async () => {
  await mongoose.connection.close()
})

// no specific order to promises
// beforeEach(async () => {
//   await Blog.deleteMany({})
//   const blogObjs = helper.initialBlogs.map((blog) => new Blog(blog))
//   const promiseArr = blogObjs.map(blog => blog.save())
//   await Promise.all(promiseArr)
// })

// specific order of execution
// beforeEach(async () => {
//   await Blog.deleteMany({})

//   for (let blog of helper.initialBlogs) {
//     let blogObject = new Blog(blog)
//     await blogObject.save()
//   }
// })
