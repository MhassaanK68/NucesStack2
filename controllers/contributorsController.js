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
    try {
      const { title, semester: semester_id, subject: subject_id } = req.body;
      const file = req.file;
      
      // Validate required fields
      if (!title || !semester_id || !subject_id) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'Title, semester, and subject are required'
        });
      }

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
          message: 'Please upload a PDF file'
        });
      }

      // Convert file to base64
      const fileBuffer = await fs.promises.readFile(file.path);
      const base64String = fileBuffer.toString('base64');

      // Google Drive upload configuration
      const webhookURL = "https://script.google.com/macros/s/AKfycbwZtBvFxOh5dGFP9FKg1j9sbJYZ3c9mkxCsZk5bLDq3v3EtxQTHEEgD2QQZUfoMRUQ/exec";
      const apiKey = process.env.GOOGLE_API_KEY;

      console.log('Starting Google Drive upload...');
      console.log('File size:', file.size, 'bytes');
      
      // Upload to Google Drive via webhook
      const response = await fetch(webhookURL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          key: apiKey,
          file: base64String,
          filename: file.originalname,
          mimeType: file.mimetype,
          title: title,
          semester_id: semester_id,
          subject_id: subject_id,
          uploader: req.user?.username || 'anonymous'
        })
      });

      const responseData = await response.text();
      console.log('Google Drive response status:', response.status);
      console.log('Google Drive response:', responseData);

      if (!response.ok) {
        let errorMessage = `Google Drive upload failed with status ${response.status}`;
        try {
          const errorData = JSON.parse(responseData);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = responseData || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to upload to Google Drive');
      }

      // Save to database
      const note = await models.notes.create({
        title,
        description: req.body.description || '',
        pdf_id: result.fileId,
        semester_id,
        subject_id,
        approved: false,
        uploader: req.user?.username || 'anonymous',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Clean up uploaded file
      try {
        await fs.promises.unlink(file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }

      res.json({
        success: true,
        message: 'Note uploaded successfully. It will be reviewed by an admin.',
        data: {
          id: note.id,
          title: note.title,
          fileId: result.fileId
        }
      });
    } catch (err) {
      console.error('Error uploading note:', err);
      
      // Clean up temp file if it exists
      if (req.file?.path) {
        try {
          await fs.promises.unlink(req.file.path);
        } catch (cleanupError) {
          console.error('Error cleaning up temp file after error:', cleanupError);
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