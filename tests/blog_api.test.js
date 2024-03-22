const { test, after, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const Blog = require('../models/blog')
const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const helper = require('./test_helper')
const api = supertest(app)

describe.only('when there are blogs in DB', () => {
  beforeEach(async () => {
    await Blog.deleteMany({})
    await Blog.insertMany(helper.initialBlogs)
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
    test('succeeds with a valid id', async () => {
      const blogs = await helper.blogsInDb()
      const blogToView = blogs[0]
      const resultBlog = await api
        .get(`/api/blogs/${blogToView.id}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      assert.deepStrictEqual(resultBlog.body, blogToView)
    })
  })

  describe('adding a blog', () => {
    test('succeeds with valid data', async () => {
      const newBlog = {
        title: 'new blog',
        author: 'Hehe Haha',
        url: 'meow.com',
        likes: 1,
      }

      await api
        .post('/api/blogs')
        .send(newBlog)
        .expect(201)
        .expect('Content-Type', /application\/json/)

      const blogs = await helper.blogsInDb()
      assert.strictEqual(blogs.length, helper.initialBlogs.length + 1)

      const titles = blogs.map(r => r.title)
      assert(titles.includes('new blog'))
    })

    test('if likes are missing, defaults to 0', async () => {
      const newBlog = {
        title: 'new blog',
        author: 'Hehe Haha',
        url: 'meow.com',
      }

      const result = await api
        .post('/api/blogs')
        .send(newBlog)

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

      await api
        .post('/api/blogs')
        .send(missingTitle)
        .expect(400)

      await api
        .post('/api/blogs')
        .send(missingUrl)
        .expect(400)
    })
  })

  describe('removing a blog', () => {
    test('succeeds with valid id', async () => {
      const blogs = await helper.blogsInDb()
      const blogToDel = blogs[0]
      await api
        .delete(`/api/blogs/${blogToDel.id}`)
        .expect(204)

      const updatedBlogs = await helper.blogsInDb()
      const titles = updatedBlogs.map(b => b.title)
      assert(!titles.includes(blogToDel.title))

      assert.strictEqual(updatedBlogs.length, helper.initialBlogs.length - 1)
    })

    test('fails with status code 400 if invalid id', async () => {
      const invalidId = '1234508'
      await api
        .delete(`/api/blogs/${invalidId}`)
        .expect(400)
    })
  })

  describe.only('updating a blog', () => {
    describe.only('with valid id', async () => {
      const blogs = await helper.blogsInDb()
      const blogToUpdate = blogs[0]
      const updatedLikes = blogToUpdate.likes + 1
      const authorName = 'Hehe Ha'

      const response = await api
        .put(`/api/blogs/${blogToUpdate.id}`)
        .send({ likes: updatedLikes, author: authorName })
        .expect(200)

      const updatedBlog = response.body

      test.only('updates likes', () => {
        assert.strictEqual(updatedBlog.likes, updatedLikes)
      })

      test.only('does not update other fields', () => {
        assert(updatedBlog.author != authorName)
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

after(async () => {
  await mongoose.connection.close()
})
