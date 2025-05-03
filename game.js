require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('./db/db'); // adjust if needed

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();

// 🔄 Load all command files
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith('!')) return;

  const userId = message.author.id;
  const username = message.author.username;

  // Update username in DB
  try {
    const playerRes = await db.query('SELECT 1 FROM players WHERE user_id = $1', [userId]);
    if (playerRes.rows.length > 0) {
      await db.query('UPDATE players SET username = $1 WHERE user_id = $2', [username, userId]);
    }
  } catch (err) {
    console.error('❌ Failed to update username:', err);
  }
  

  // 🔍 Parse command
  const args = message.content.slice(1).trim().split(/ +/); // "!register something"
  const commandName = args.shift().toLowerCase(); // get "register"

  const command = client.commands.get(commandName);
  if (!command) return;

  try {
    await command(message, args);
  } catch (error) {
    console.error(`❌ Error executing ${commandName}:`, error);
    message.reply('There was an error trying to execute that command!');
  }
});

client.login(process.env.DISCORD_TOKEN);