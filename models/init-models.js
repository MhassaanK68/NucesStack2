var DataTypes = require("sequelize").DataTypes;
var _admins = require("./admins");
var _chapters = require("./chapters");
var _metadata = require("./metadata");
var _notes = require("./notes");
var _semesters = require("./semesters");
var _subjects = require("./subjects");

function initModels(sequelize) {
  var admins = _admins(sequelize, DataTypes);
  var chapters = _chapters(sequelize, DataTypes);
  var metadata = _metadata(sequelize, DataTypes);
  var notes = _notes(sequelize, DataTypes);
  var semesters = _semesters(sequelize, DataTypes);
  var subjects = _subjects(sequelize, DataTypes);

  notes.belongsTo(semesters, { as: "semester", foreignKey: "semester_id"});
  semesters.hasMany(notes, { as: "notes", foreignKey: "semester_id"});
  subjects.belongsTo(semesters, { as: "semester", foreignKey: "semester_id"});
  semesters.hasMany(subjects, { as: "subjects", foreignKey: "semester_id"});
  chapters.belongsTo(subjects, { as: "subject", foreignKey: "subject_id"});
  subjects.hasMany(chapters, { as: "chapters", foreignKey: "subject_id"});
  notes.belongsTo(subjects, { as: "subject", foreignKey: "subject_id"});
  subjects.hasMany(notes, { as: "notes", foreignKey: "subject_id"});

  return {
    admins,
    chapters,
    metadata,
    notes,
    semesters,
    subjects,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
