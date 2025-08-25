var DataTypes = require("sequelize").DataTypes;
var _notes = require("./notes");
var _subjects = require("./subjects");

function initModels(sequelize) {
  var notes = _notes(sequelize, DataTypes);
  var subjects = _subjects(sequelize, DataTypes);


  return {
    notes,
    subjects,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
