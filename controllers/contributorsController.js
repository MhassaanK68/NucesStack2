const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const fs = require("fs");

const sequelize = require('../config/db');
const initModels = require("../models/init-models");
const models = initModels(sequelize);

const pushNotificationToNtfy = require("../utils/notify").pushNotificationToNtfy;

exports.uploadNotes = async (req, res) => {
  // Ensure we have a valid session
  if (!req.session?.user) {
    return res.redirect("/login");
  }
  // Ensure we have a file and required fields
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { title, semester: semester_id, subject: subject_id } = req.body;
  
  // Validate required fields
  if (!title || !semester_id || !subject_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Extract file info
  const { path, originalname, mimetype } = req.file;
  
  // Initialize response sent flag
  let responseSent = false;
  
  // Function to send response if not already sent
  const sendResponse = (status, data) => {
    if (!responseSent) {
      responseSent = true;
      if (status === 'success') {
        return res.status(200).json({ 
          success: true, 
          message: 'Note uploaded successfully! It will be reviewed by an admin.' 
        });
      } else {
        return res.status(status).json({ 
          success: false, 
          error: data 
        });
      }
    }
  };

  try {
    const file = req.file;
    const title = req.body.title;
    const semester_id = req.body.semester;
    const subject_id = req.body.subject;

    const scriptId = "AKfycbwZtBvFxOh5dGFP9FKg1j9sbJYZ3c9mkxCsZk5bLDq3v3EtxQTHEEgD2QQZUfoMRUQ";
    const webhookURL = `https://script.google.com/macros/s/${scriptId}/exec`;
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return sendResponse(500, 'Google API key is not configured');
    }

    try {
      // Read PDF file and convert to base64
      const fileBuffer = fs.readFileSync(path);
      const base64String = fileBuffer.toString("base64");

      // Prepare request data
      const formData = new URLSearchParams();
      formData.append('key', apiKey);
      formData.append('file', base64String);
      formData.append('filename', originalname);
      formData.append('mimeType', mimetype);
      formData.append('title', title);
      formData.append('semester_id', semester_id);
      formData.append('subject_id', subject_id);
      formData.append('uploader', req.session.user.username || 'anonymous');

      console.log('Sending request to Google Apps Script...');
      
      // Send to Google Apps Script
      const response = await fetch(webhookURL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${apiKey}`
        },
        body: formData,
        redirect: 'follow'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google Apps Script error response:', errorText);
        return sendResponse(500, `Google Apps Script error: ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        return sendResponse(500, `Google Apps Script error: ${result.message || 'Unknown error'}`);
      }

      if (!result.fileId) {
        return sendResponse(500, 'Google Drive upload failed: No fileId in response');
      }

      // Save to database with approved: false
      await models.notes.create({
        title: title,
        description: req.body.description || '',
        pdf_id: result.fileId,
        web_view_link: result.webViewLink,
        web_content_link: result.webContentLink,
        semester_id: semester_id,
        subject_id: subject_id,
        approved: false,
        uploader: req.session.user.username,
        created_at: new Date(),
        updated_at: new Date()
      });

      // Cleanup local temp file
      fs.unlink(path, (err) => {
        if (err) console.error("Error deleting file:", err);
      });

      // Push notification to ntfy
      pushNotificationToNtfy(`New Notes Uploaded`, `Title: ${title}\nUploader: ${req.session.user.username}\nPending admin approval.`);
      return sendResponse('success');
      
    } catch (err) {
      console.error('Error in upload process:', err);
      return sendResponse(500, err.message || 'An error occurred during file upload');
    }
  } catch (err) {
    console.error('Unexpected error:', err);
    return sendResponse(500, 'An unexpected error occurred');
  }
};