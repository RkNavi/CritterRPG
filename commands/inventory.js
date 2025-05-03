const db = require('../db/db');
const { EmbedBuilder } = require('discord.js');

module.exports = async function inventory(message) {
  const userId = message.author.id;

  try {
    const playerRes = await db.query('SELECT * FROM players WHERE user_id = $1', [userId]);
    if (playerRes.rows.length === 0) {
      return message.reply('```❌ You are not registered yet. Use !register first.```');
    }

    const itemsRes = await db.query(`
        SELECT i.name, pi.quantity, i.emoji
        FROM player_items pi
        JOIN items i ON pi.item_id = i.id
        WHERE pi.user_id = $1
        ORDER BY i.name ASC
    `, [userId]);

    if (itemsRes.rows.length === 0) {
      return message.reply('```🎒 Your inventory is empty.```');
    }

    // Build ASCII table
    const rows = itemsRes.rows.map(item => {
        const emoji = item.emoji || '';
        const name = (emoji + ' ' + item.name).padEnd(22, ' ');
        const qty = String(item.quantity).padStart(6, ' ');
        return `| ${name} | ${qty} |`;
      });      

    const tableHeader = [
      '📦 Inventory',
      '',
      '+----------------------+----------+',
      '| Item Name            | Quantity |',
      '+----------------------+----------+',
    ];

    const tableFooter = ['+----------------------+----------+'];

    const table = [...tableHeader, ...rows, ...tableFooter].join('\n');

    const embed = new EmbedBuilder()
      .setTitle(`${message.member.displayName}'s Inventory`)
      .setDescription(`\`\`\`\n${table}\n\`\`\``)
      .setColor(0x00bfff)
      .setFooter({ text: 'Use !craft [name] to create a Critter!' })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });

  } catch (err) {
    console.error('❌ Error in !inventory:', err);
    message.reply('```❌ Something went wrong fetching your inventory.```');
  }
};