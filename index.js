const express = require('express');
const sequelize = require('./config/db');
const User = require('./models/user');
const lookupRoutes = require('./routes/lookup-routes')
require('dotenv').config();
const cors = require('cors')

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // for form data
app.use(cors());

// Error Logging Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).send('Internal Server Error');
});

app.use('/api/lookup', lookupRoutes);

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

sequelize.authenticate()
  .then(() => console.log('✅ Connected to MySQL'))
  .catch(err => console.error('❌ DB connection error:', err));

sequelize.sync();

// EJS route: list users
app.get('/users', async (req, res) => {
  try {
    const users = await User.findAll();
    res.render('users/index', { users });
  } catch (err) {
    console.error('Error in GET /users:', err);
    res.status(500).send('Error loading users');
  }
});

let patientData = {
  "personalInfo": {
    "regNo": 17631,
    "dateReg": "2025-07-23",
    "fullName": "Hassan Mehmood",
    "dob": null,
    "age": 20,
    "education": "Bachelors",
    "phone": "0330-7039460",
    "mrNo": "1361252",
    "profession": "Software Engineer",
    "address": "Township",
    "typeDm": 2,
    "diagnosisDate": "2015-01-01",
    "diagnosisAge": null,
    "dateInsulinAdviced": null,
    "dateInsulinStarted": null,
    "menarche": null,
    "menstrualCycle": null,
    "menopause": null,
    "gpa": null,
    "familyHistory": null,
    "notes": "patient is under a lot of stress due to academic and family burdens",
    "insulinInstructions": null,
    "prescriptionNotes": null,
    "message1": null,
    "message2": null,
    "message3": null,
    "alternateMedicine": null,
    "nsaidUse": null,
    "religion": null,
    "ref": null,
    "certificate": null,
    "medicalAlerts": null,
    "clinic": false,
    "height": 5.3,
    "nonPublic": null,
    "idealWeight": "70-75",
    "reportDate": null,
    "discount": "0",
    "lmp": null,
    "edd": null,
    "gestationalAgeByLmp": null,
    "gestationalAgeByUs": null
  },
  "prescriptions": [],
  "medicines": [
    {
      "id": 65481,
      "regNo": 17631,
      "medicine": 375,
      "instruction": 53,
      "dose": "3",
      "duration": 1,
      "dateStarted": "2025-07-23"
    }
  ],
  "problems": [
    {
      "id": 33097,
      "regNo": 17631,
      "problem": 2,
      "diagnosisDate": "2025-07-23",
      "status": "Active",
      "side": "N/A"
    },
    {
      "id": 34107,
      "regNo": 17631,
      "problem": 2,
      "diagnosisDate": "2025-08-01",
      "status": "Unknown",
      "side": "Right"
    }
  ],
  "clinicalExams": [],
  "labTests": []
}

app.get('/api/get-patient-data', (req, res) => {
  res.json(patientData);
})

// EJS route: form to create user
app.get('/users/new', (req, res) => {
  res.render('users/new');
});

// Form handler
app.post('/users', async (req, res) => {
  try {
    const { name, email } = req.body;
    await User.create({ name, email });
    res.redirect('/users');
  } catch (err) {
    res.status(400).send('Error creating user: ' + err.message);
  }
});

app.listen(3000, () => console.log('🚀 Server running on port 3000'));
