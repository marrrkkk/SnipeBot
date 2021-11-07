const { Client, Message, MessageEmbed } = require('discord.js')
const moment = require('moment')

module.exports = {
    name: 'aliases',
    aliases: ['alias'],

    /**
     * @param {Client} client
     * @param {Message} message
     * @param {String[]} args
     */

    run: async(client, message, args) => {
        const embed = new MessageEmbed()
        .setAuthor(message.author.tag, message.author.displayAvatarURL())
        .setTitle('Command Aliases')
        .setDescription("snipe - `s`\nesnipe - `es`, `editsnipe`\nbsnipe - `bs`, `botsnipe`\nbesnipe - `bes`, `botesnipe`\nusnipe - `us`, `usersnipe`\nuesnipe - `ues`, `useresnipe`\npsnipe - `ps`, `pingsnipe`\nrsnipe - \`rs\`, \`reactsnipe\`\nrmsnipe - \`rms\`, \`removesnipe\`\ncsnipe - `cs`, `clearsnipe`\navatar - `av`\nwhois - `userinfo`")
        .setColor('BLURPLE')
        .setTimestamp()

        message.channel.send({ embeds: [embed] })
    }
}