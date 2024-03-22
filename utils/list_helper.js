const _ = require("lodash");

const dummy = (blogs) => {
  return 1
}

const totalLikes = (blogs) => {
  const reducer = (sum, blog) => {
    return sum + blog.likes
  }

  return blogs.length === 0
    ? 0
    : blogs.reduce(reducer, 0)
}

const favoriteBlog = (blogs) => {
  let mostLikes = blogs[0]
  blogs.forEach(blog => {
    if (blog.likes > mostLikes.likes) {
      mostLikes = blog
    }
  })

  return {
    title: mostLikes.title,
    author: mostLikes.author,
    likes: mostLikes.likes
  }
}

const mostBlogs = (blogs) => {
  if (blogs.length === 0) return {}
  // const blogCount = _.reduce(blogs, function(result, blog) {
  //   if (!result[blog.author]) result[blog.author] = 0;
  //   result[blog.author] += 1;
  //   return result;
  // }, {})

  const blogCount = _.countBy(blogs, (blog) => { return blog.author })

  return _.maxBy(_.map(blogCount, function(num, name) {
    return { author: name, blogs: num }
  }), "blogs")
}

const mostLikes = (blogs) => {
  if (blogs.length === 0) return {}

  const likeCount = _.reduce(blogs, (result, blog) => {
    if (!result[blog.author]) result[blog.author] = 0;
    result[blog.author] += blog.likes;
    return result;
  }, {})

  return _.maxBy(_.map(likeCount, (num, name) => {
    return { author: name, likes: num };
  }), "likes")
}

module.exports = {
  dummy,
  totalLikes,
  favoriteBlog,
  mostBlogs,
  mostLikes
}
