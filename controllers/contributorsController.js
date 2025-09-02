const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const fs = require("fs");
const FormData = require("form-data");

exports.uploadNotes = async (req, res) => {
  try {

    console.log('title:', req.body.title);
    console.log('semester:', req.body.semester);
    console.log('subject:', req.body.subject);
      
    const file = req.file;
    const title = req.body.title;
    const semester = req.body.semester;
    const subject = req.body.subject;


    const WebhookURL = "https://eoe5ko3v6i5j0de.m.pipedream.net";


    const formData = new FormData();
    formData.append("file", fs.createReadStream(file.path), file.originalname);
    formData.append("title", title);
    formData.append("semester", semester);
    formData.append("subject", subject);

    const response = await fetch(WebhookURL, {
      method: "POST",
      body: formData,
      headers: formData.getHeaders(),
    });

    if (!response.ok) throw new Error(`PipeDream returned ${response.status}`);

    // ✅ Delete local file after sending to Zapier
    fs.unlink(file.path, (err) => {
      if (err) console.error("Error deleting file:", err);
    });

    res.send("✅ Notes uploaded and sent to Zapier!");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Upload failed. ");
  }
};
