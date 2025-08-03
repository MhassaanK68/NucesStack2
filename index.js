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
    "regNo": 17637,
    "dateReg": "2025-07-25",
    "fullName": "Asjid Asghar ",
    "dob": null,
    "age": 15,
    "education": "Matric",
    "phone": "0311-1111111",
    "mrNo": "125125",
    "profession": "Unemployed",
    "address": "Township",
    "typeDm": 11,
    "diagnosisDate": "2025-07-25",
    "diagnosisAge": null,
    "dateInsulinAdviced": null,
    "dateInsulinStarted": null,
    "menarche": null,
    "menstrualCycle": "Unknown",
    "menopause": null,
    "gpa": "3.35",
    "familyHistory": null,
    "notes": "He is not good",
    "insulinInstructions": null,
    "prescriptionNotes": null,
    "message1": "2",
    "message2": null,
    "message3": null,
    "alternateMedicine": null,
    "nsaidUse": null,
    "religion": null,
    "ref": null,
    "certificate": null,
    "medicalAlerts": null,
    "clinic": false,
    "height": 5.8,
    "nonPublic": null,
    "idealWeight": "70",
    "reportDate": null,
    "discount": "0",
    "lmp": null,
    "edd": null,
    "gestationalAgeByLmp": null,
    "gestationalAgeByUs": null
  },
  "prescriptions": [
    {
      "id": 7929,
      "regNo": 17637,
      "insulin": 40,
      "morning": 10,
      "evening": null,
      "noon": null,
      "night": null
    },
    {
      "id": 7930,
      "regNo": 17637,
      "insulin": 12,
      "morning": 5,
      "evening": 15,
      "noon": 10,
      "night": 100
    }
  ],
  "medicines": [
    {
      "id": 65485,
      "regNo": 17637,
      "medicine": 331,
      "instruction": 1,
      "dose": "2",
      "duration": 1,
      "dateStarted": "2025-7-1"
    },
    {
      "id": 66485,
      "regNo": 17637,
      "medicine": 331,
      "instruction": 1,
      "dose": "2",
      "duration": 2,
      "dateStarted": "2025-8-1"
    }
  ],
  "problems": [
    {
      "id": 33105,
      "regNo": 17637,
      "problem": 2,
      "diagnosisDate": "2025-07-25",
      "status": "Relapsed",
      "side": "Both"
    },
    {
      "id": 34105,
      "regNo": 17637,
      "problem": 13,
      "diagnosisDate": "2025-07-31",
      "status": "Relapsed",
      "side": "N/A"
    },
    {
      "id": 34106,
      "regNo": 17637,
      "problem": 6,
      "diagnosisDate": "2025-08-01",
      "status": "Active",
      "side": "Right"
    }
  ],
  "clinicalExams": [
    {
      "id": 21751,
      "examDate": "2025-07-25",
      "bsf": null,
      "regNo": 17637,
      "wt": 60,
      "bmi": null,
      "postDinner": "400",
      "exercise": 1,
      "smbg": 1,
      "smoking": "on",
      "mealPlan": 3,
      "bp": "69",
      "preDinner": "300",
      "bsPoc": null,
      "iiefTotal": null,
      "iief1": null,
      "iief2": null,
      "iief3": null,
      "iief4": null,
      "iief5": null,
      "secondHour": null,
      "height": null,
      "postLunch": "600",
      "preLunch": "400",
      "abuse": "on",
      "majorConcern": null,
      "temp": "150",
      "oneHour": null
    }
  ],
  "labTests": [
    {
      "id": 9903,
      "ketones": "+ve",
      "pcHpf": null,
      "tsh": null,
      "regNo": 17637,
      "examDate": "2025-08-03",
      "a1c": "5",
      "tg": null,
      "cho": null,
      "ldl": null,
      "vldl": null,
      "hdl": "3.4",
      "crtinin": null,
      "uAlb": null,
      "micoAlb": null,
      "protein24Hr": "78",
      "egfr": null,
      "na": null,
      "k": 5.5,
      "hco3": null,
      "ca": null,
      "pho4": null,
      "vitD": null,
      "alt": null,
      "uricAcid": "6",
      "hcv": null,
      "hbv": null,
      "hiv": null,
      "others1": "Hemoglobin Low",
      "others2": null,
      "others3": null
    }
  ]
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
