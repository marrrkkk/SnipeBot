const { Client, Message, MessageEmbed} = require('discord.js')

module.exports = {
    name: 'uptime',

    /**
     * @param {Client} client
     * @param {Message} message
     */

    run: async(client, message) => {
        let days = Math.floor(client.uptime / 86400000 );
        let hours = Math.floor(client.uptime / 3600000 ) % 24;
        let minutes = Math.floor(client.uptime / 60000) % 60;
        let seconds = Math.floor(client.uptime / 1000) % 60;

        const embed = new MessageEmbed()
        .addField('Current uptime', `${days}d ${hours}h ${minutes}m ${seconds}s`)
        .addField('Last restarted', `<t:${Math.floor(client.readyTimestamp / 1000)}:F>`)
        .setColor('#2f3136')

        await message.channel.send({ embeds: [embed] }).catch(e => console.log(e))
    }
}