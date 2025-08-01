const express = require('express');
const router = express.Router();
const sequelize = require('../config/db');

// Initialize Sequelize models
const initModels = require('../models/init-models'); // Sequelize auto-generated models
const db = initModels(sequelize);

console.log('Available models:', Object.keys(db));


// Destructure all models from `db`
const { 
  Users,
  durationlkp: Duration,
  exerciselkp: Exercise,
  instructionlkp: Instruction,
  insulin_instructionslkp: InsulinInstruction,
  insulinlkp: Insulin,
  mainconcernlkp: MainConcern,
  mealplanlkp: MealPlan,
  medicinelkp: Medicine,
  messageslkp: Messages,
  problemlkp: Problem,
  smbglkp: Smbg
} = db;


// Generic function to build lookup GET routes
const createLookupRoute = (path, model) => {
  router.get(path, async (req, res) => {
    try {
      const items = await model.findAll();
      res.json(items);
    } catch (error) {
      console.error(`Error fetching ${path}:`, error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });
};

// Register lookup routes
createLookupRoute('/durations', Duration);
createLookupRoute('/exercises', Exercise);
createLookupRoute('/instructions', Instruction);
createLookupRoute('/insulin-instructions', InsulinInstruction);
createLookupRoute('/insulins', Insulin);
createLookupRoute('/main-concerns', MainConcern);
createLookupRoute('/meal-plans', MealPlan);
createLookupRoute('/medicines', Medicine);
createLookupRoute('/messages', Messages);
createLookupRoute('/problems', Problem);
createLookupRoute('/smbgs', Smbg);

module.exports = router;
