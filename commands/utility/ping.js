const { Client, Message, MessageEmbed } = require('discord.js')
module.exports = {
    name: 'ping',

    /**
     * @param {Client} client
     * @param {Message} message
     */

    run: async(client, message) => {
        const embed = new MessageEmbed()
        .setDescription('Getting ping...')
        .setColor('#2f3136')

        try {
            await message.channel.send({ embeds: [embed] }).then(msg => {
                const ping = msg.createdTimestamp - message.createdTimestamp
                const pong = new MessageEmbed()
                .setDescription(`<:comment:902027656097300491> Bot Latency - \`${ping}ms\`\n<:globe:902027655057141811> API Latency - \`${client.ws.ping}ms\``)
                .setColor('#2f3136')
                
                msg.edit({ embeds: [pong] })
            })
        } catch (error) {
            console.log(error)
        }
    }
}