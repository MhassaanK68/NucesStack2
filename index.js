const express = require('express');
const sequelize = require('./config/db');
const User = require('./models/user');
require('dotenv').config();

const app = express();
app.use(express.json());

// Test DB connection
sequelize.authenticate()
  .then(() => console.log('✅ Connected to MySQL'))
  .catch(err => console.error('❌ DB connection error:', err));

// Sync DB
sequelize.sync();

app.get('/users', async (req, res) => {
  const users = await User.findAll();
  res.json(users);
});

app.post('/users', async (req, res) => {
  try {
    const { name, email } = req.body;
    const newUser = await User.create({ name, email });
    res.status(201).json(newUser);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('🚀 Server running on port 3000'));
