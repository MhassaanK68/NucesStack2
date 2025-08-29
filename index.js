const express = require('express');
const sequelize = require('./config/db');

const initModels = require("./models/init-models");
const models = initModels(sequelize);

require('dotenv').config();
const cors = require('cors')

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true })); 
app.use(cors());
app.use(express.static('public'));
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
  res.render('main.ejs');
})

app.get('/admin', (req, res) => {
  if (!req.user){
    res.redirect("/login");
    return
  }
  res.render('admin.ejs');
})

app.get('/login', (req, res) => {
  res.render('login.ejs');
})

app.get('/semester', async (req, res) => {
  try {
    const { semester } = req.query; 

    if (!semester) {
      return res.status(400).send('Semester not specified');
    }

    const subjects = await models.subjects.findAll({
      where: { semester: semester }
    });

    res.render('semester.ejs', { semester: semester, subjects });
  } catch (err) {
    console.error('Error fetching subjects:', err);
    res.status(500).send('Server error');
  }
});

app.get('/subject', (req, res) => {
  res.render('subject.ejs');
})



app.listen(3000, () => console.log('🚀 Server running on port 3000'));
