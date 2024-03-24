const Blog = require('../models/blog')
const User = require('../models/user')
const bcrypt = require('bcrypt')

const initialBlogs = [
  {
    title: "React patterns",
    author: "Michael Chan",
    url: "https://reactpatterns.com/",
    likes: 7,
  },
  {
    title: "Go To Statement Considered Harmful",
    author: "Edsger W. Dijkstra",
    url: "http://www.u.arizona.edu/~rubinson/copyright_violations/Go_To_Considered_Harmful.html",
    likes: 5,
  },
]

const blogsInDb = async () => {
  const blogs = await Blog
    .find({}).populate('user', { 'username': 1, 'name': 1 })
  return blogs.map(blog => blog.toJSON())
}


const usersInDb = async () => {
  const users = await User
    .find({}).populate('blogs')
  return users.map(user => user.toJSON())
}

const userBlogs = async (user) => {
  return initialBlogs.map(blog => {
    blog.user = user.id
    return blog
  })
}

const adminUser = async () => {
  await User.deleteMany({})

  const passwordHash = await bcrypt.hash('sekret', 10)
  const user = new User({ username: 'root', passwordHash })

  await user.save()
  return user
}

module.exports = {
  initialBlogs, blogsInDb, usersInDb, userBlogs, adminUser
}
