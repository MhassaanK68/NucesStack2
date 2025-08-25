const express = require('express');
const sequelize = require('./config/db');
require('dotenv').config();
const cors = require('cors')

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 
app.use(cors());
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

// Error Logging Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).send('Internal Server Error');
});


sequelize.authenticate()
  .then(() => console.log('✅ Connected to MySQL'))
  .catch(err => console.error('❌ DB connection error:', err));

sequelize.sync();

app.get('/', (req, res) => {
  res.render('index');
})


app.listen(3000, () => console.log('🚀 Server running on port 3000'));
