const express = require('express');
const sequelize = require('./config/db');
const User = require('./models/user');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // for form data

// Error Logging Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).send('Internal Server Error');
});

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

sequelize.authenticate()
  .then(() => console.log('✅ Connected to MySQL'))
  .catch(err => console.error('❌ DB connection error:', err));

sequelize.sync();

// EJS route: list users
app.get('/users', async (req, res) => {
  try {
    const users = await User.findAll();
    res.render('users/index', { users });
  } catch (err) {
    console.error('Error in GET /users:', err);
    res.status(500).send('Error loading users');
  }
});


// EJS route: form to create user
app.get('/users/new', (req, res) => {
  res.render('users/new');
});

// Form handler
app.post('/users', async (req, res) => {
  try {
    const { name, email } = req.body;
    await User.create({ name, email });
    res.redirect('/users');
  } catch (err) {
    res.status(400).send('Error creating user: ' + err.message);
  }
});

app.listen(3000, () => console.log('🚀 Server running on port 3000'));
