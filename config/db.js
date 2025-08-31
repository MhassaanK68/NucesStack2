const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.MYSQLDATABASE,
  process.env.MYSQLUSER,
  process.env.MYSQLPASSWORD,
  {
    host: process.env.MYSQLHOST,
    dialect: 'mysql',
    port: process.env.MYSQLPORT,
    dialectOptions: {
      ssl: {
        rejectUnauthorized: true, // ensures secure connection
      }
    }
  }
);

module.exports = sequelize;
