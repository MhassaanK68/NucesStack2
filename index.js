const express = require('express');
const sequelize = require('./config/db');
const session = require('express-session');
const bcrypt = require('bcrypt');

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

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'nucesstack',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true if using HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Error Logging Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).send('Internal Server Error');
});


sequelize.authenticate()
  .then(() => console.log('✅ Connected to MySQL'))
  .catch(err => console.error('❌ DB connection error:', err));



app.get('/', async (req, res) => {

  console.log("Home Page accessed by IP = [", req.ip, "]")

  const semesters = await models.semesters.findAll();
  res.render('main.ejs', {semesters});
  
})

app.get('/admin', (req, res) => {
  if (!req.session.user){
    res.redirect("/login");
    return
  }
  console.log("Admin Panel accessed by IP = [", req.session.user.username, "]")
  res.render('admin.ejs');
})

app.get('/login', (req, res) => {
  res.render('login.ejs', {error: null});
})

// POST login endpoint
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).render('login.ejs', { 
        error: 'Username and password are required' 
      });
    }

    // Find admin by username (using email field as username)
    const admin = await models.admins.findOne({
      where: { username: username }
    });

    if (!admin) {
      return res.status(401).render('login.ejs', { 
        error: 'Invalid credentials' 
      });
    }

    // Compare password (assuming plain text for now - should be hashed in production)
    if (admin.password !== password) {
      return res.status(401).render('login.ejs', { 
        error: 'Invalid credentials' 
      });
    }

    // Set session
    req.session.user = {
      id: admin.id,
      username: admin.username
    };

    res.redirect('/admin');
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).render('login.ejs', { 
      error: 'Login failed. Please try again.' 
    });
  }
})

// Logout endpoint
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/login');
  });
})

// POST login endpoint
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).render('login.ejs', { 
        error: 'Email and password are required' 
      });
    }

    // Find admin by username (using email field as username)
    const admin = await models.admins.findOne({
      where: { username: email }
    });

    if (!admin) {
      return res.status(401).render('login.ejs', { 
        error: 'Invalid credentials' 
      });
    }

    // Compare password (assuming plain text for now - should be hashed in production)
    if (admin.password !== password) {
      return res.status(401).render('login.ejs', { 
        error: 'Invalid credentials' 
      });
    }

    // Set session
    req.session.user = {
      id: admin.id,
      username: admin.username
    };

    res.redirect('/admin');
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).render('login.ejs', { 
      error: 'Login failed. Please try again.' 
    });
  }
})

// Logout endpoint
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/login');
  });
})

// Specific Semester Page
app.get('/u/:semesterSlug', async (req, res) => {
 
  try {
    const { semesterSlug } = req.params;

    // Get semester by slug
    const semester = await models.semesters.findOne({
      where: { slug: semesterSlug }
    });

    if (!semester) {
      return res.status(404).render("not-found.ejs");
    }
      
    // Use Semester ID to get Associated Subjects
    const subjects = await models.subjects.findAll({
      where: { semester_id: semester.id  }
    });

    console.log(`${semester.name} accessed by IP = [`, req.ip, "]")
    res.render('semester.ejs', { semester: semester, subjects });
  } 
  catch (err) {
    console.error('Error fetching subjects:', err);
    res.status(500).render('server-error.ejs');
  }
});

// Specific Subject in Specific Semester Page
app.get('/u/:semesterSlug/:subjectSlug', async (req, res) => {
  try {
    const { semesterSlug, subjectSlug } = req.params;
    // Find semester
    const semester = await models.semesters.findOne({
      where: { slug: semesterSlug },
      attributes: ['id', 'name', 'slug'],
    });

    if (!semester) {
      return res.status(404).redirect("/not-found");
    }

    // Find subject inside that semester
    const subject = await models.subjects.findOne({
      where: { slug: subjectSlug, semester_id: semester.id },
      attributes: ['id', 'name', 'slug'],
    });

    if (!subject) {
      return res.status(404).redirect("/not-found");
    }

    // Find notes inside the subject
    const notes = await models.notes.findAll({
      where: { subject_id: subject.id, semester_id: semester.id },
    })

    if (!subject) {
      return res.status(404).redirect("/not-found");
    }

    console.log(`${subject.name} accessed by IP = [`, req.ip, "]")
    res.render("subject", { semester, subject, notes });

  } catch (err) {
    console.error(err);
    res.status(500).render("server-error.ejs");
  }
});

// Content Viewer
app.get('/view-notes', (req, res)=>{
  const { id } = req.query;
  console.log(`Notes with ID ["${id}"] viewed by IP = [`, req.ip, "]")
  res.render('content-viewer.ejs', {document: id})
})

// API Routes for Admin Panel
// Import admin controller
const adminController = require('./controllers/adminController');

// Admin API routes
app.get('/api/semesters', adminController.getSemesters);
app.get('/api/subjects', adminController.getSubjects);
app.post('/api/subjects', adminController.addSubject);
app.delete('/api/subjects/:id', adminController.deleteSubject);
app.get('/api/subjects/:id/notes', adminController.getNotesBySubject);
app.post('/api/notes', adminController.addNote);
app.delete('/api/notes/:id', adminController.deleteNote);
app.get('/api/notes/count', adminController.getNotesCount);


app.use((req, res, next) => {
  res.status(404).render('not-found.ejs');
});




app.listen(3000, () => console.log('🚀 Server running on port 3000'));
