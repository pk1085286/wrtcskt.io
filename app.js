const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/webrtc-app', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// Define User model
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true },
  password: { type: String, required: true },
  resetPasswordToken: String,
  resetPasswordExpires: Date
});
const User = mongoose.model('User', UserSchema);

// Set up session middleware
app.use(session({
  secret: 'my-secret-key',
  resave: false,
  saveUninitialized: true,
  store: new MongoStore({ mongooseConnection: mongoose.connection })
}));

// Set up middleware to parse JSON and URL-encoded request bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html as the home page
app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle user registration
app.post('/register', async function(req, res) {
  try {
    const user = new User({
      email: req.body.email,
      password: await bcrypt.hash(req.body.password, 10)
    });
    await user.save();
    res.status(200).send({ message: 'User registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Error registering user' });
  }
});

// Handle user login
app.post('/login', async function(req, res) {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(401).send({ message: 'Incorrect email or password' });
    }
    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) {
      return res.status(401).send({ message: 'Incorrect email or password' });
    }
    req.session.userId = user.id;
    res.status(200).send({ message: 'User logged in successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Error logging in user' });
  }
});

// Handle user logout
app.get('/logout', function(req, res) {
  req.session.destroy();
  res.status(200).send({ message: 'User logged out successfully' });
});

// Handle password reset request
app.post('/forgot-password', async function(req, res) {
  try {
    const user = await User.findOne({ email: req.body.email });
