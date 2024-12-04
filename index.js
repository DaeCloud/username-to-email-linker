const express = require("express");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const axios = require('axios');
const querystring = require('querystring');

const app = express();
const port = 3000;

require('dotenv').config();

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;
const DISCORD_API_BASE_URL = process.env.DISCORD_API_BASE_URL;

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
            discord_username TEXT NOT NULL,
            is_verified INTEGER DEFAULT 0
        )
    `);
});

// Step 1: Redirect to Discord's OAuth2 authorization page
app.get('/discord/login', (req, res) => {
  const minecraftUsername = req.query.username; // Capture the username from query
  if (!minecraftUsername) {
    return res.status(400).send("Minecraft username is required.");
  }

  // Add the username to the redirect URL to carry it through the OAuth2 process
  const redirectUri = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&response_type=code&scope=identify%20guilds&state=${encodeURIComponent(minecraftUsername)}`;

  res.redirect(redirectUri);
});


app.get('/discord/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).send('Authorization code not provided');
  }

  // The Minecraft username is in the 'state' parameter
  const minecraftUsername = state;
  if (!minecraftUsername) {
    return res.status(400).send('Minecraft username not provided');
  }

  try {
    // Exchange the authorization code for an access token
    const response = await axios.post(
      `https://discord.com/api/v10/oauth2/token`,
      querystring.stringify({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: DISCORD_REDIRECT_URI,
        scope: 'identify guilds',
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token } = response.data;

    const userResponse = await axios.get(`${DISCORD_API_BASE_URL}/users/@me`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const discordUsername = userResponse.data.username;

    db.get("SELECT * FROM users WHERE discord_username = ?", [discordUsername], async function (err, row) {
      if (row) {
        return res.redirect('/?success=false&message=You%20have%20already%20linked%20an%20account.');
      }

      // Step 3: Use the access token to retrieve the user's guilds
      const guildsResponse = await axios.get(
        `${DISCORD_API_BASE_URL}/users/@me/guilds`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      );

      const userGuilds = guildsResponse.data;

      // Check if the user is in the specific guild (replace with your guild ID)
      const targetGuildId = process.env.TARGET_GUILD_ID; // replace with the actual server ID
      const isUserInGuild = userGuilds.some(guild => guild.id === targetGuildId);

      if (isUserInGuild) {
        // Insert the Minecraft username into the database
        db.run(
          `INSERT INTO users (minecraft_username, discord_username, is_verified) VALUES (?, ?, ?)`,
          [minecraftUsername, discordUsername, 1],
          function (err) {
            if (err) {
              console.error(err);
              return res
                .status(500)
                .json({ success: false, message: "Error saving user data." });
            }

            // Redirect to home page with success=true
            res.redirect('/?success=true');
          }
        );
      } else {
        return res.redirect('/?success=false&message=You%20could%20not%20be%20verified.%20Please%20ensure%20that%20you%20are%20part%20of%20the%20correct%20Discord%20server.');
      }
    });


  } catch (error) {
    console.error('Error during OAuth2 flow:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get("/isVerified/:username", (req, res) => {
  // Access the username parameter
  const username = req.params.username;

  db.get("SELECT is_verified FROM users WHERE minecraft_username = ?", [username], function (err, row) {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ success: false, is_verified: false });
    }

    if (!row) {
      return res.json({
        success: true,
        is_verified: false,
      });
    }

    return res.json({
      success: true,
      is_verified: row.is_verified == 1 ? true : false,
    });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
