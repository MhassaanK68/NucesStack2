const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const fs = require("fs");
const FormData = require("form-data");

exports.uploadNotes = async (req, res) => {
  try {

    console.log()

    const file = req.file;
    const title = req.body.title || "No Title";

    // Zapier webhook URL
    const zapierWebhookURL = "https://eoe5ko3v6i5j0de.m.pipedream.net";

    // Create form-data to send actual file
    const formData = new FormData();
    formData.append("file", fs.createReadStream(file.path), file.originalname);
    formData.append("title", title);

    const response = await fetch(zapierWebhookURL, {
      method: "POST",
      body: formData,
      headers: formData.getHeaders(),
    });

    if (!response.ok) throw new Error(`Zapier returned ${response.status}`);

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
