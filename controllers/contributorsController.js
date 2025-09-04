const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const fs = require("fs");

const sequelize = require('../config/db');
const initModels = require("../models/init-models");
const models = initModels(sequelize);


exports.uploadNotes = async (req, res) => {

  if (!req.session.user) {
    res.redirect("/login");
  }

  try {
    const file = req.file;
    const title = req.body.title;
    const semester_id = req.body.semester;
    const subject_id = req.body.subject;

    const WebhookURL = "https://script.google.com/macros/s/AKfycbwZtBvFxOh5dGFP9FKg1j9sbJYZ3c9mkxCsZk5bLDq3v3EtxQTHEEgD2QQZUfoMRUQ/exec";
    const apiKey = process.env.GOOGLE_API_KEY;

    // Read PDF file and convert to base64
    const fileBuffer = fs.readFileSync(file.path);
    const base64String = fileBuffer.toString("base64");

    // Send to Google Apps Script
    const response = await fetch(WebhookURL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        key: apiKey,
        file: base64String,
        filename: file.originalname,
        mimeType: file.mimetype,
      }),
    });

    if (!response.ok) throw new Error(`Apps Script returned ${response.status}`);

    const result = await response.json();
    if (result.success != true) throw new Error(`Apps Script error: ${result.message}`);

    pdf_id = result.fileId


    // Save to DB here (title, semester, subject, result.webViewLink)
    models.notes.create({
      title: title,
      pdf_id: pdf_id,
      semester_id: semester_id,
      subject_id: subject_id,
      approved: false,
      uploader: req.session.user.username || 'anonymous'
    })

    // Cleanup local temp file
    fs.unlink(file.path, (err) => {
      if (err) console.error("Error deleting file:", err);
    });

    res.redirect("/admin?status=success");
  } catch (err) {
    console.error(err);
    res.redirect("/admin?status=error");
  }
};