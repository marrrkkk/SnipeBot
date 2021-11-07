const { Client, Message } = require('discord.js')
const db = require('quick.db')

module.exports = {
    name: 'setprefix',
    alises: ['prefix'],

    /**
     * @param {Client} client
     * @param {Message} message
     * @param {String[]} args
     */

    run: async(client, message, args) => {
        if(!message.member.permissions.has('ADMINISTRATOR')) return;
        
        let prefix = args[0]

        if(!args[0]) return message.reply('<:cross:890077548799725619> Provide a new prefix')
        if(prefix.length > 5) return message.reply('<:cross:890077548799725619> Max character for prefix is `5`')

        await db.set(`prefix_${message.guild.id}`, prefix)
        await message.channel.send(`<:check:889870069243478127> Prefix has been set to ${prefix}`)
    }
}