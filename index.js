const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const sqlite3 = require("sqlite3").verbose();
const crypto = require("crypto");

const app = express();
const port = 3000;

require('dotenv').config()

// Allowed email domain
const allowedDomain = process.env.ALLOWED_DOMAIN;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static("public"));

const path = require("path");
const fs = require("fs");

// Ensure /data directory exists
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Database setup
const dbPath = path.join(dataDir, "users.db");
const db = new sqlite3.Database(dbPath); // Persistent SQLite database
db.serialize(() => {
  db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            minecraft_username TEXT NOT NULL,
            email TEXT NOT NULL,
            verification_code TEXT,
            is_verified INTEGER DEFAULT 0
        )
    `);
});

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_SERVER, // Replace with your SMTP server
  port: process.env.SMTP_PORT, // Usually 587 for TLS, or 465 for SSL
  secure: true, // Set to true if using port 465 (SSL)
  auth: {
    user: process.env.SMTP_USERNAME, // Replace with your email address
    pass: process.env.SMTP_PASSWORD, // Replace with your email password or app-specific password
  },
});

// Registration endpoint
app.post("/register", (req, res) => {
  const { username, email } = req.body;

  if (!username || !email) {
    return res.status(400).json({
      success: false,
      message: "Minecraft username and email are required.",
    });
  }

  if (!email.endsWith(allowedDomain)) {
    return res.status(400).json({
      success: false,
      message: "Email must belong to the company domain.",
    });
  }

  const verificationCode = crypto.randomInt(100000, 999999).toString();

  db.run(
    `INSERT INTO users (minecraft_username, email, verification_code) VALUES (?, ?, ?)`,
    [username, email, verificationCode],
    function (err) {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ success: false, message: "Error saving user data." });
      }

      // Send email with verification code
      transporter.sendMail(
        {
          from: process.env.EMAIL_ADDRESS, // Replace with your email
          to: email,
          subject: process.env.EMAIL_SUBJECT,
          text: process.env.EMAIL_MESSAGE.replace("{verificationCode}", verificationCode),
        },
        (err) => {
          if (err) {
            console.error(err);
            // remove entry form db
            db.run(`REMOVE FROM users WHERE minecraft_username = ? AND email = ?`, [username, email], function(err){
              return res
              .status(500)
              .json({ success: false, message: "Error sending email." });
            });
          }

          res.json({
            success: true,
            message:
              "Registration successful. Check your email for the verification code.",
          });
        }
      );
    }
  );
});

// Verification endpoint
app.post("/verify", (req, res) => {
  const { username, verificationCode } = req.body;

  if (!username || !verificationCode) {
    return res.status(400).json({
      success: false,
      message: "Username and verification code are required.",
    });
  }

  db.get(
    `SELECT * FROM users WHERE minecraft_username = ? AND verification_code = ?`,
    [username, verificationCode],
    (err, row) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ success: false, message: "Error verifying user." });
      }

      if (!row) {
        return res.status(400).json({
          success: false,
          message: "Invalid username or verification code.",
        });
      }

      db.run(
        `UPDATE users SET is_verified = 1 WHERE id = ?`,
        [row.id],
        (err) => {
          if (err) {
            console.error(err);
            return res.status(500).json({
              success: false,
              message: "Error updating verification status.",
            });
          }

          res.json({
            success: true,
            message:
              "Verification successful! Your email has been verified and your account has been whitelisted on the server.",
          });
        }
      );
    }
  );
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
