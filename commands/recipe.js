// commands/recipe.js
const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

module.exports = async function recipe(message, args) {
  const inputName = args.join(' ');
  if (!inputName) {
    return message.reply('```❌ Please specify a Critter name. Example: !recipe Vixitron```');
  }

  try {
    const evolutionChains = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/evolutionChains.json')));
    const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/recipes.json')));
    const critters = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/critters.json')));

    // Find the evolution chain that contains the input name
    const chain = evolutionChains.find(chain =>
      chain.forms.some(form => form.name.toLowerCase() === inputName.toLowerCase())
    );

    if (!chain) {
      return message.reply('```❌ That Critter is not part of any known evolution chain.```');
    }

    const embed = new EmbedBuilder()
      .setTitle(`🧪 Crafting Recipe: ${inputName}`)
      .setColor(0x9b59b6)
      .setFooter({ text: 'Craft higher-tier Critters by merging 3 of the previous form + items.' })
      .setTimestamp();

    // Try to add image if available
    const foundCritter = critters.find(c => c.name.toLowerCase() === inputName.toLowerCase());
    if (foundCritter && foundCritter.img) {
      embed.setImage(foundCritter.img);
    }

    for (const form of chain.forms) {
      const recipe = recipes.find(r => r.critter_name.toLowerCase() === form.name.toLowerCase());

      if (!recipe) {
        embed.addFields({
          name: `🧩 ${form.rank} - ${form.name}`,
          value: '_No recipe data available._',
        });
        continue;
      }

      const items = Object.entries(recipe.required_items)
        .map(([item, qty]) => `• ${item} x${qty}`)
        .join('\n');

      embed.addFields({
        name: `🧩 ${form.rank} - ${form.name}`,
        value: `\`\`\`\n${items}\n\`\`\``,
      });
    }

    return message.reply({ embeds: [embed] });
  } catch (err) {
    console.error('❌ Error in !recipe:', err);
    return message.reply('```❌ Something went wrong while fetching the recipe.```');
  }
};
