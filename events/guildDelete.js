const client = require('../index')
const { MessageEmbed } = require('discord.js')

client.on('guildDelete', async guild => {
    const embed = new MessageEmbed()
    .setTitle('Guild Remove')
    .setThumbnail(guild.iconURL())
    .addField('Name', `${guild.name}`)
    .addField('STATS',`**Users:** ${guild.members.cache.filter(m => !m.user.bot).size}\n**Bots:** ${guild.members.cache.filter(m => m.user.bot).size}\n**Total Members:** ${guild.memberCount}\n**Total Server:** ${client.guilds.cache.size}`)
    .setColor('RED')
    .setFooter(`ID: ${guild.id}`)

    client.channels.cache.get('893716885617664062').send({ embeds: [embed] }).catch(e => console.log(e))
})