const jwt = require("jsonwebtoken");

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;   
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET; 

function generateAccessToken(user) {
  return jwt.sign(
    {id: user.id, username: user.username, role: user.role }, 
    ACCESS_SECRET, 
    { expiresIn: "1m" }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    {id: user.id, username: user.username, role: user.role }, 
    REFRESH_SECRET, 
    { expiresIn: "7d" }
  );
}

function verifyAccessToken(token) {
  try {
    return jwt.verify(token, ACCESS_SECRET);
  } catch (err) {
    return null;
  }
}

function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch (err) {
    return null;
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
};
