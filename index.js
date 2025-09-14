// Basic Packages
const express = require('express');
const sequelize = require('./config/db');
const session = require('express-session');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

// JWT
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require("./utils/jwt");
const authenticateToken = require("./middlewares/verify-jwt");

// In-memory store for refresh tokens because abhi redis ke paisay nahi ha :(
let refreshTokens = [];

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
app.use(cookieParser());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.set("trust proxy", true);

// Session Middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true if using HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Import JWT utilities
const { authMiddleware, generateToken } = require('./utils/jwtUtils');

// Apply JWT auth middleware to all API routes
app.use(authMiddleware);

// Error Logging Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).send('Internal Server Error');
});


sequelize.authenticate()
  .then(() => console.log('✅ Connected to MySQL'))
  .catch(err => console.error('❌ DB connection error:', err));

// JWT Token Generation Endpoint with API key protection
const handleGetToken = async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    // Check if API key is provided and valid
    if (!apiKey || apiKey !== process.env.API_KEY) {
      console.warn('Invalid or missing API key from IP:', req.ip);
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Invalid or missing API key'
      });
    }

    const token = generateToken();
    console.log('New JWT token generated for IP:', req.ip);
    
    res.json({ 
      success: true,
      token: token,
      expiresIn: '5m',
      message: 'Token generated successfully'
    });
  } catch (error) {
    console.error('Token generation error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Token generation failed',
      message: error.message
    });
  }
};

// Frontend proxy endpoint for token generation
app.get('/frontend-get-token', async (req, res) => {
  try {
    // Forward the request to the internal token endpoint with the API key
    const response = await fetch(`${process.env.API_URL || 'http://localhost:3000'}/api/get-token`, {
      headers: {
        'x-api-key': process.env.API_KEY
      }
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy token generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Token generation failed',
      message: error.message
    });
  }
});

// Register token endpoints
app.get('/api/get-token', handleGetToken);
app.get('/get-token', handleGetToken);

app.get('/', async (req, res) => {

  const semesters = await models.semesters.findAll();
  res.render('main.ejs', {semesters});
  
})

// Sends the access and refresh tokens to the user only if logged in
app.get("/api/token", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Login to krlo boss :)" });
  }

  const user = req.session.user;
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  refreshTokens.push(refreshToken);
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true, 
    sameSite: "strict"
  });

  res.json({ accessToken });
});

// Generated a new access token if the refresh token is valid
app.post("/api/refresh", (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken || !refreshTokens.includes(refreshToken)) {
    return res.status(403).json({ error: "Invalid refresh token" });
  }

  const payload = verifyRefreshToken(refreshToken);
  if (!payload) return res.sendStatus(403);

  const newAccessToken = generateAccessToken(payload);
  res.json({ accessToken: newAccessToken });
});



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


// Admin API routes
app.get('/api/semesters', authenticateToken, adminController.getSemesters);
app.get('/api/subjects', authenticateToken,adminController.getSubjects);
app.post('/api/subjects', authenticateToken,adminController.addSubject);
app.delete('/api/subjects/:id', authenticateToken,adminController.deleteSubject);
app.get('/api/subjects/:id/notes', authenticateToken,adminController.getNotesBySubject);
app.post('/api/notes', authenticateToken,adminController.addNote);
app.delete('/api/notes/:id', authenticateToken,adminController.deleteNote);
app.get('/api/notes/count', authenticateToken,adminController.getNotesCount);
app.get('/api/pending-notes', authenticateToken,adminController.getPendingNotes); // returns JSON
app.post('/admin/approve-note/:id', authenticateToken,adminController.approveNote);
app.post('/admin/deny-note/:id', authenticateToken,adminController.denyNote);
app.post('/contribute/upload-your-notes', upload.single('file'), contributorsController.uploadNotes);


app.use((req, res, next) => {
  res.status(404).render('not-found.ejs');
});




app.listen(3000, () => console.log('🚀 Server running on port 3000'));
