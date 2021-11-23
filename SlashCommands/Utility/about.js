const { Client, CommandInteraction, MessageEmbed } = require('discord.js')
const { color, emojis } = require('../../config.json')

module.exports = {
    name: 'about',
    description: "Bot's information",

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */

    run: async(client, interaction, args) => {
        try {
            await interaction.deferReply({ ephemeral: true }).catch(() => {});
            let days = Math.floor(client.uptime / 86400000 );
            let hours = Math.floor(client.uptime / 3600000 ) % 24;
            let minutes = Math.floor(client.uptime / 60000) % 60;
            let seconds = Math.floor(client.uptime / 1000) % 60;
    
            const about = new MessageEmbed()
            .setAuthor('About', interaction.user.displayAvatarURL())
            .setDescription(`<@${client.user.id}> is an advanced discord snipe bot that can snipe any deleted and edited messages(including images) and up to 20 messages, [Invite here](https://discord.com/oauth2/authorize?client_id=884249240090607637&scope=applications.commands+bot&permissions=380104984640)`)
            .addField('Developer', `[markk#1312](https://discord.com/users/814406096022011934)`)
            .addField("Stats", `${emojis.home} ${client.guilds.cache.size}/100 servers\n${emojis.add} ${client.users.cache.size} users`)
            .addField("Info", `${emojis.djs} Discord.js \`v13.1.0\`\n${emojis.js} Node.js \`v16.6.1\``)
            .addField('Uptime', `\`\`\`${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds\`\`\``)
            .setColor(color)

            await interaction.editReply({ embeds: [about] })
        } catch (error) {
            console.log(error)
        }
    }
}