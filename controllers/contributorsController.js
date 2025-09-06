const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const fs = require("fs");

const sequelize = require('../config/db');
const initModels = require("../models/init-models");
const models = initModels(sequelize);

const { verifyToken } = require('../utils/jwtUtils');

/**
 * Middleware to verify JWT token
 */
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false,
      error: 'Unauthorized',
      message: 'No token provided. Use Authorization: Bearer <token>'
    });
  }

  const token = authHeader.substring(7);
  
  try {
    // Verify token
    req.user = verifyToken(token);
    next();
  } catch (error) {
    console.error('JWT verification failed:', error);
    const status = error.name === 'TokenExpiredError' ? 401 : 403;
    res.status(status).json({
      success: false,
      error: 'Authentication failed',
      message: error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token'
    });
  }
};

/**
 * Upload notes with JWT authentication
 */
exports.uploadNotes = [
  authenticateJWT,
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        message: 'Please upload a PDF file'
      });
    }

    try {
      const { title, semester: semester_id, subject: subject_id } = req.body;
      
      if (!title || !semester_id || !subject_id) {
        throw new Error('Title, semester and subject are required');
      }

      const WebhookURL = "https://script.google.com/macros/s/AKfycbwZtBvFxOh5dGFP9FKg1j9sbJYZ3c9mkxCsZk5bLDq3v3EtxQTHEEgD2QQZUfoMRUQ/exec";
      const apiKey = process.env.GOOGLE_API_KEY;

      // Read PDF file and convert to base64
      const fileBuffer = await fs.readFile(req.file.path);
      const base64String = fileBuffer.toString("base64");

      // Send to Google Apps Script
      const response = await fetch(WebhookURL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          key: apiKey,
          file: base64String,
          filename: req.file.originalname,
          mimeType: req.file.mimetype,
        }),
      });

      if (!response.ok) {
        throw new Error(`Apps Script returned ${response.status}`);
      }

      const result = await response.json();
      if (result.success !== true) {
        throw new Error(`Apps Script error: ${result.message}`);
      }

      // Save to database
      await models.notes.create({
        title,
        pdf_id: result.fileId,
        semester_id,
        subject_id,
        approved: false,
        uploader: req.user?.username || 'anonymous',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Cleanup local temp file
      await fs.unlink(req.file.path);

      res.json({
        success: true,
        message: 'Note uploaded successfully. It will be reviewed by an admin.'
      });
    } catch (err) {
      console.error('Error uploading note:', err);
      
      // Cleanup temp file if it exists
      if (req.file?.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupErr) {
          console.error('Error cleaning up temp file:', cleanupErr);
        }
      }
      
      res.status(500).json({
        success: false,
        error: 'Upload failed',
        message: err.message || 'An error occurred while uploading the note'
      });
    }
  }
];