const { Client, Message } = require('discord.js')

module.exports = {
    name: 'purge',

    /**
     * @param {Client} client
     * @param {Message} message
     * @param {String[]} args
     */

    run: async(client, message, args) => {
        if(!message.guild.me.permissions.has("MANAGE_MESSAGES")) return message.reply('Missing Permission: `MANAGE_MESSAGES`')
        if(!message.member.permissions.has("MANAGE_MESSAGES")) return message.reply('Missing Permission: `MANAGE_MESSAGES`')

        const member = message.mentions.members.first()
        const messages = message.channel.messages.fetch()

        try {
            if(member){
                const amount = args[1]
                const userMessages = (await messages).filter(m => m.author.id === message.author.id)
                let deleted = 0
                await userMessages.forEach(async (msg) => {
                    if(deleted >= amount) return
                    await msg.delete()
                    await deleted++
                })
            } else {
                const amount = args[0]
                if(!amount) return message.reply('Please provide an amount')
                if(isNaN(amount)) return message.reply('Please provide a valid amount')
                if(amount > 99) return message.reply('Max amount is `99`')
                await message.channel.bulkDelete(parseInt(args[0]) + 1)
            }
        } catch (error) {
            console.log(error)
        }
    }
}