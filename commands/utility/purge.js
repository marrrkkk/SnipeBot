const { Client, Message } = require('discord.js')

module.exports = {
    name: 'purge',
    aliases: ['clear'],

    /**
     * @param {Client} client
     * @param {Message} message
     * @param {String[]} args
     */

    run: async(client, message, args) => {
        if(!message.guild.me.permissions.has("MANAGE_MESSAGES")) return message.reply('Missing Permission: `MANAGE_MESSAGES`')
        if(!message.member.permissions.has("MANAGE_MESSAGES")) return message.reply('Missing Permission: `MANAGE_MESSAGES`')

        if(!args[0]) return message.reply('Please provide a valid amount')
        if(isNaN(args[0])) return message.reply('Not a valid number')
        if(parseInt(args[0] > 99)) return message.reply("Max amount is `99`")

        await message.channel.bulkDelete(parseInt(args[0]) + 1).catch(err => console.log(err))
    }
}