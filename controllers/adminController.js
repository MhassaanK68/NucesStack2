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
        console.log('Missing semester_id in query parameters');
        return res.status(400).json({ error: 'semester_id is required' });
      }
      
      console.log(`Fetching notes count for semester_id: ${semester_id}`);
      
      // Verify database connection
      await sequelize.authenticate();
      console.log('Database connection established successfully');
      
      // Get the count of notes for the semester
      const count = await models.notes.count({
        where: { 
          semester_id: parseInt(semester_id), 
          approved: true 
        }
      });
      
      console.log(`Found ${count} notes for semester ${semester_id}`);
      return res.json({ count });
      
    } catch (error) {
      console.error('Error in getNotesCount:', {
        message: error.message,
        stack: error.stack,
        query: req.query,
        error: error.original ? error.original.message : 'No original error'
      });
      return res.status(500).json({ 
        error: 'Failed to fetch notes count',
        details: error.message 
      });
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
      const note = await models.notes.findByPk(id);
      
      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }

      await note.destroy();
      res.json({ message: 'Note denied and deleted successfully' });
    } catch (error) {
      console.error('Error denying note:', error);
      res.status(500).json({ error: 'Failed to deny note' });
    }
  },

  // Get a single note by ID
  getNoteById: async (req, res) => {
    try {
      const { id } = req.params;
      const note = await models.notes.findByPk(id, {
        include: [
          {
            model: models.subjects,
            as: 'subject',
            attributes: ['id', 'name']
          }
        ]
      });

      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }

      // Add subject_name to the note object for consistency
      const noteData = note.get({ plain: true });
      if (noteData.subject) {
        noteData.subject_name = noteData.subject.name;
      }

      res.json(noteData);
    } catch (error) {
      console.error('Error fetching note:', error);
      res.status(500).json({ error: 'Failed to fetch note' });
    }
  },
  
  // Update an existing note
  updateNote: async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, pdf_id, video_id } = req.body;
      
      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }
      
      // Find the note first to ensure it exists
      const note = await models.notes.findByPk(id);
      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }
      
      // Prepare update data
      const updateData = { 
        title, 
        description: description || '',
        pdf_id: pdf_id || null,
        video_id: video_id || null
      };
      
      // Update the note
      await note.update(updateData);
      
      // Fetch the updated note with subject info
      const updatedNote = await models.notes.findByPk(id, {
        include: [
          {
            model: models.subjects,
            as: 'subject',
            attributes: ['id', 'name']
          }
        ]
      });
      
      // Format the response
      const responseData = updatedNote.get({ plain: true });
      if (responseData.subject) {
        responseData.subject_name = responseData.subject.name;
      }
      
      res.json(responseData);
      
    } catch (error) {
      console.error('Error updating note:', error);
      res.status(500).json({ error: 'Failed to update note' });
    }
  }

};

module.exports = adminController;
