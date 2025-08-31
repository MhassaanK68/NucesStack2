const sequelize = require('../config/db');
const initModels = require('../models/init-models');
const models = initModels(sequelize);

const adminController = {
  // Get all semesters
  getSemesters: async (req, res) => {
    try {
      const semesters = await models.semesters.findAll({
        attributes: ['id', 'name', 'slug'],
        order: [['id', 'ASC']]
      });
      res.json(semesters);
    } catch (error) {
      console.error('Error fetching semesters:', error);
      res.status(500).json({ error: 'Failed to fetch semesters' });
    }
  },

  // Get subjects (optionally filtered by semester)
  getSubjects: async (req, res) => {
    try {
      const { semester_id } = req.query;
      
      const whereClause = semester_id ? { semester_id } : {};
      
      const subjects = await models.subjects.findAll({
        where: whereClause,
        attributes: [
          'id', 'name', 'slug', 'semester_id', 'description',
          [sequelize.fn('COUNT', sequelize.col('notes.id')), 'notesCount']
        ],
        include: [{
          model: models.notes,
          as: 'notes',
          attributes: []
        }],
        group: ['subjects.id'],
        order: [['id', 'ASC']]
      });
      
      res.json(subjects);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      res.status(500).json({ error: 'Failed to fetch subjects' });
    }
  },

  // Add new subject
  addSubject: async (req, res) => {
    try {
      const { name, semester_id } = req.body;
      
      if (!name || !semester_id) {
        return res.status(400).json({ error: 'Subject name and semester_id are required' });
      }

      // Create slug from name
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      const subject = await models.subjects.create({
        name,
        slug,
        semester_id
      });
      
      res.json(subject);
    } catch (error) {
      console.error('Error creating subject:', error);
      res.status(500).json({ error: 'Failed to create subject' });
    }
  },

  // Delete subject
  deleteSubject: async (req, res) => {
    try {
      const { id } = req.params;
      
      const deleted = await models.subjects.destroy({
        where: { id }
      });
      
      if (deleted) {
        res.json({ message: 'Subject deleted successfully' });
      } else {
        res.status(404).json({ error: 'Subject not found' });
      }
    } catch (error) {
      console.error('Error deleting subject:', error);
      res.status(500).json({ error: 'Failed to delete subject' });
    }
  },

  // Get notes by subject
  getNotesBySubject: async (req, res) => {
    try {
      const { id } = req.params;
      const notes = await models.notes.findAll({
        where: { subject_id: id },
        attributes: ['id', 'title', 'description', 'pdf_id', 'video_id'],
        order: [['id', 'ASC']]
      });
      res.json(notes);
    } catch (error) {
      console.error('Error fetching notes:', error);
      res.status(500).json({ error: 'Failed to fetch notes' });
    }
  },

  // Add new note
  addNote: async (req, res) => {
    try {
      const { title, subject_id, semester_id, description = '', pdf_id = '', video_id = '' } = req.body;
      
      if (!title || !subject_id) {
        return res.status(400).json({ error: 'Title and subject_id are required' });
      }

      const note = await models.notes.create({
        title,
        description,
        subject_id,
        semester_id,
        pdf_id,
        video_id
      });
      
      res.json(note);
    } catch (error) {
      console.error('Error creating note:', error);
      res.status(500).json({ error: 'Failed to create note' });
    }
  },

  // Delete note
  deleteNote: async (req, res) => {
    try {
      const { id } = req.params;
      
      const deleted = await models.notes.destroy({
        where: { id }
      });
      
      if (deleted) {
        res.json({ message: 'Note deleted successfully' });
      } else {
        res.status(404).json({ error: 'Note not found' });
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      res.status(500).json({ error: 'Failed to delete note' });
    }
  }
};

module.exports = adminController;
