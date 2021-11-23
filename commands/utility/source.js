const { Client, Message, MessageActionRow, MessageButton } = require('discord.js')
const { emojis } = require('../../config.json')

module.exports = {
    name: 'source',
    aliases: ['src'],

    /**
     * @param {Client} client
     * @param {Message} message
     */

    run: async(client, message) => {
        const row = new MessageActionRow()
        .addComponents(
            new MessageButton()
            .setLabel('Github')
            .setEmoji(emojis.github)
            .setURL('https://github.com/marrrkkk')
            .setStyle('LINK'),

            new MessageButton()
            .setLabel('Repository')
            .setEmoji(emojis.repo)
            .setURL('https://github.com/marrrkkk/SnipeBot')
            .setStyle('LINK')
        )
        await message.channel.send({ content: 'https://github.com/marrrkkk/SnipeBot', components: [row] })
    }
}