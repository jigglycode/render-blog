const { test, after, beforeEach } = require('node:test')
const assert = require('node:assert')
const Blog = require('../models/blog')
const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const helper = require('./test_helper')
const api = supertest(app)

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

test('a valid blog can be added ', async () => {
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

test('a specific blog can be viewed', async () => {
  const blogs = await helper.blogsInDb()
  const blogToView = blogs[0]
  const resultBlog = await api
    .get(`/api/blogs/${blogToView.id}`)
    .expect(200)
    .expect('Content-Type', /application\/json/)

  assert.deepStrictEqual(resultBlog.body, blogToView)
})

test('a blog saved without likes will default to 0', async () => {
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

test('a blog can be deleted', async () => {
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

test('a blog missing title or url will respond with 400', async () => {
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

// no specific order to promises
beforeEach(async () => {
  await Blog.deleteMany({})
  const blogObjs = helper.initialBlogs.map((blog) => new Blog(blog))
  const promiseArr = blogObjs.map(blog => blog.save())
  await Promise.all(promiseArr)
})

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
