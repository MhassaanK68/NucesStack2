const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('notes', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('pdf','video'),
      allowNull: false
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    subject_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'subjects',
        key: 'id'
      }
    },
    semester_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'semesters',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'notes',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "fk_2",
        using: "BTREE",
        fields: [
          { name: "subject_id" },
        ]
      },
      {
        name: "fk_3",
        using: "BTREE",
        fields: [
          { name: "semester_id" },
        ]
      },
    ]
  });
};
