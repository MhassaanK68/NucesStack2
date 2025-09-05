// Basic Packages
const express = require('express');
const sequelize = require('./config/db');
const session = require('express-session');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const jwt = require('jsonwebtoken');

// Controllers
const contributorsController = require('./controllers/contributorsController');
const adminController = require('./controllers/adminController');

// Database and Models
const initModels = require("./models/init-models");
const models = initModels(sequelize);

// App Settings
require('dotenv').config();
const cors = require('cors')
const app = express();

// Basic Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 
app.use(cors());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.set("trust proxy", true);

// Session Middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'nucesstack',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true if using HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// JWT Authentication Middleware
const authMiddleware = (req, res, next) => {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Access denied. No token provided.',
      message: 'Authorization header with Bearer token is required'
    });
  }

  // Extract token from "Bearer <token>"
  const token = authHeader.substring(7);

  try {
    // Verify token using JWT_SECRET from environment variables
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Add decoded token data to request object
    next(); // Continue to next middleware/route handler
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ 
        error: 'Token expired',
        message: 'Please request a new token'
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        error: 'Invalid token',
        message: 'Token is malformed or invalid'
      });
    } else {
      return res.status(403).json({ 
        error: 'Token verification failed',
        message: 'Unable to verify token'
      });
    }
  }
};

// Error Logging Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).send('Internal Server Error');
});


sequelize.authenticate()
  .then(() => console.log('✅ Connected to MySQL'))
  .catch(err => console.error('❌ DB connection error:', err));

// JWT Token Generation Route
app.get('/get-token', (req, res) => {
  try {
    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'JWT_SECRET not configured'
      });
    }

    // Generate JWT token with empty payload and 5-minute expiration
    const token = jwt.sign(
      {}, // Empty payload as requested
      process.env.JWT_SECRET, // Secret from environment variables
      { expiresIn: '5m' } // Token expires in 5 minutes
    );

    console.log('New JWT token generated for IP:', req.ip);
    
    res.json({ 
      token: token,
      expiresIn: '5m',
      message: 'Token generated successfully'
    });
  } catch (error) {
    console.error('Token generation error:', error);
    res.status(500).json({ 
      error: 'Token generation failed',
      message: 'Unable to generate authentication token'
    });
  }
});

app.get('/', async (req, res) => {

  const semesters = await models.semesters.findAll();
  res.render('main.ejs', {semesters});
  
})

app.get('/admin', (req, res) => {

  const usrSession = req.session.user

  if (!usrSession){
    res.redirect("/login");
    return
  }
  console.log("Admin Panel accessed by IP = [",usrSession.username, "]")
  if (usrSession.role == "admin"){
    res.render('admin.ejs');
  }
  else if (usrSession.role == "contributor"){
    res.render('contributor.ejs');
  }
  else{
    res.send("who are you?");
  }
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
      username: admin.username,
      role: admin.role
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
      where: { subject_id: subject.id, semester_id: semester.id , approved: true},
      attributes: ['id', 'title', 'pdf_id', 'video_id', 'description']
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


// Protected Admin API routes - All /api/* routes require JWT authentication
app.get('/api/semesters', authMiddleware, adminController.getSemesters);
app.get('/api/subjects', authMiddleware, adminController.getSubjects);
app.post('/api/subjects', authMiddleware, adminController.addSubject);
app.delete('/api/subjects/:id', authMiddleware, adminController.deleteSubject);
app.get('/api/subjects/:id/notes', authMiddleware, adminController.getNotesBySubject);
app.get('/api/notes/:id', authMiddleware, adminController.getNoteById);
app.put('/api/notes/:id', authMiddleware, adminController.updateNote);
app.post('/api/notes', authMiddleware, adminController.addNote);
app.delete('/api/notes/:id', authMiddleware, adminController.deleteNote);
app.get('/api/notes-count', authMiddleware, adminController.getNotesCount);
app.get('/api/pending-notes', authMiddleware, adminController.getPendingNotes); // returns JSON
app.post('/admin/approve-note/:id', adminController.approveNote);
app.post('/admin/deny-note/:id', adminController.denyNote);

app.post('/contribute/upload-your-notes', upload.single('file'), contributorsController.uploadNotes);


app.use((req, res, next) => {
  res.status(404).render('not-found.ejs');
});




app.listen(3000, () => console.log('🚀 Server running on port 3000'));
