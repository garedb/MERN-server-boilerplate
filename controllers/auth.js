require('dotenv').config()
let db = require('../models')
let router = require('express').Router()
let jwt = require('jsonwebtoken')

// POST /auth/login (find and validate user; send token)
router.post('/login', (req, res) => {
  console.log(req.body)
  // Look up the user by their email
  db.User.findOne({ email: req.body.email })
  .then(user => {
    // Check whether user exists
    if (!user) {
      // They don't have an account, send error message
      return res.status(404).send({ message: 'User not found!' })
    }
    // They exist - but make sure their password is correct
    if (!user.validPassword(req.body.password)) {
      // Incorrect password, send error back
      return res.status(401).send({ message: 'Invalid credentials' })
    }
    // We have a good user - make them a new token and send to them
    let token = jwt.sign(user.toJSON(), process.env.JWT_SECRET, {
      expiresIn: 60 * 60 * 8 // 8 hours, in seconds
    })
    res.send({ token })
  })
  .catch(err => {
    console.log('Error in POST /auth/login', err)
    res.status(503).send({ message: 'Server-side or DB error' })
  })
})

// POST to /auth/signup (create user; generate token)
router.post('/signup', (req, res) => {
  console.log(req.body)
  // Look up the user by email to make sure they are "new"
  db.User.findOne({ email: req.body.email })
  .then(user => {
    // If user exists already then do NOT let them make another account
    if(user) {
      // No no! Sign up instead!
      return res.status(409).send({ message: 'Email address already in use' })
    }
    // We know the user is legitimately a new user: Create them!
    db.User.create(req.body)
    .then(newUser => {
      // Yay! Things worked and users exist now! Create a token for the new user
      let token = jwt.sign(newUser.toJSON(), process.env.JWT_SECRET, {
        expiresIn: 120 // 60 * 60 * 8 // -----8 hours, in seconds
      })
      res.send({ token })
    })
    .catch(innerErr => {
      console.log('Error creating user', innerErr)
      if (innerErr.name === 'ValidationError') {
        res.status(412).send({ message: `Validation Error! ${innerErr.message}.`})
      }
      else {
        res.status(500).send({ message: 'Error creating user' })
      }
    })
  })
  .catch(err => {
    console.log('ERROR IN POST /auth/signup', err)
    res.status(503).send({ message: 'Database or server error!'})
  })
})

module.exports = router