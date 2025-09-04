const sequelize = require('../config/db');
const initModels = require('../models/init-models');
const models = initModels(sequelize);

function getDriveFileId(url) {
    // Regex to match Google Drive file links and extract FILE_ID
    const regex = /https:\/\/drive\.google\.com\/(?:file\/d\/|uc\?id=)([a-zA-Z0-9_-]+)(?:\/view|\?.*)?/;

    const match = url.match(regex);

    if (match) {
        return match[1]; // Extracted FILE_ID
    } else {
        return false; // Not a valid Google Drive file link
    }
}

function isValidYouTubeLink(url) {
    // Regex to match YouTube video links
    const regex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[&?].*)?$/;

    const match = url.match(regex);

    if (match) {
        return true; // Valid YouTube link
    } else {
        return false; // Not a valid YouTube link
    }
}

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

      let NoteID;

      if (pdf_id !== '') {
          NoteID = getDriveFileId(pdf_id);
          console.log(NoteID)
          if (NoteID === false) {
              return res.status(400).json({ error: 'Notes link must be a Google Drive link' });
          }
      }


      const note = await models.notes.create({
        title,
        description,
        subject_id,
        semester_id,
        pdf_id: NoteID,
        video_id,
        approved: true,
        uploader: req.session.user ? req.session.user.username : 'anonymous'
      });
      
      console

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
  },

  // Get notes count for a semester
  getNotesCount: async (req, res) => {
    try {
      const { semester_id } = req.query;
      
      if (!semester_id) {
        return res.status(400).json({ error: 'semester_id is required' });
      }
      
      const count = await models.notes.count({
        where: { semester_id, approved: true }
      });
      
      res.json({ count });
    } catch (error) {
      console.error('Error fetching notes count:', error);
      res.status(500).json({ error: 'Failed to fetch notes count' });
    }
  },

  getPendingNotes: async (req, res) => {
    try {
      const notes = await models.notes.findAll({
        where: { approved: false },
        attributes: ['id', 'title', 'description', 'pdf_id', 'video_id', 'uploader', 'semester_id', 'subject_id'],
        order: [['id', 'ASC']]
      });
      res.status(200).json({ notes }); 
    } catch (error) {
      console.error('Error fetching pending notes:', error);
      res.status(500).json({ error: 'Failed to fetch pending notes' });
    }
  },

  approveNote: async (req, res) => {
    try {
      const { id } = req.params;
      await models.notes.update({ approved: true }, { where: { id } });
      res.status(200).json({message: "note has been approved & pushed to DB"})
    } catch (error) {
      console.error('Error approving note:', error);
      res.status(500).json({ error: 'Failed to approve note' });
    }
  },

  denyNote: async (req, res) => {
    try {
      const { id } = req.params;
      let note = models.notes.findOne({ where: { id }, attributes: ['pdf_id'] });
      await models.metadata.create({ denied_file_ids: note.pdf_id });
      await models.notes.destroy({ where: { id } });
      await 
      res.status(200).json({message: "note has been denied & removed from DB"})
    } catch (error) {
      console.error('Error denying note:', error);
      res.status(500).json({ error: 'Failed to deny note' });
    }
  }

};

module.exports = adminController;
