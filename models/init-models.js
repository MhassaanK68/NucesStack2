var DataTypes = require("sequelize").DataTypes;
var _Users = require("./Users");
var _durationlkp = require("./durationlkp");
var _exerciselkp = require("./exerciselkp");
var _instructionlkp = require("./instructionlkp");
var _insulin_instructionslkp = require("./insulin_instructionslkp");
var _insulinlkp = require("./insulinlkp");
var _mainconcernlkp = require("./mainconcernlkp");
var _mealplanlkp = require("./mealplanlkp");
var _medicinelkp = require("./medicinelkp");
var _messageslkp = require("./messageslkp");
var _problemlkp = require("./problemlkp");
var _smbglkp = require("./smbglkp");

function initModels(sequelize) {
  var Users = _Users(sequelize, DataTypes);
  var durationlkp = _durationlkp(sequelize, DataTypes);
  var exerciselkp = _exerciselkp(sequelize, DataTypes);
  var instructionlkp = _instructionlkp(sequelize, DataTypes);
  var insulin_instructionslkp = _insulin_instructionslkp(sequelize, DataTypes);
  var insulinlkp = _insulinlkp(sequelize, DataTypes);
  var mainconcernlkp = _mainconcernlkp(sequelize, DataTypes);
  var mealplanlkp = _mealplanlkp(sequelize, DataTypes);
  var medicinelkp = _medicinelkp(sequelize, DataTypes);
  var messageslkp = _messageslkp(sequelize, DataTypes);
  var problemlkp = _problemlkp(sequelize, DataTypes);
  var smbglkp = _smbglkp(sequelize, DataTypes);


  return {
    Users,
    durationlkp,
    exerciselkp,
    instructionlkp,
    insulin_instructionslkp,
    insulinlkp,
    mainconcernlkp,
    mealplanlkp,
    medicinelkp,
    messageslkp,
    problemlkp,
    smbglkp,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
