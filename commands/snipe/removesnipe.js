const { Client, Message } = require('discord.js')

module.exports = {
    name: 'removesnipe',
    aliases: ['rms', 'rmsnipe'],

    /**
     * @param {Client} client
     * @param {Message} message
     * @param {String[]} args
     */

    run: async(client, message, args) => {
        try {
            if(!message.member.permissions.has('MANAGE_MESSAGES')) return await message.react('❌')
            const snipes = client.snipes.get(message.channel.id)
            const fsnipes = client.fsnipes.get(message.channel.id)
            const usnipes = client.usnipes.get(message.channel.id)
            const esnipes = client.esnipes.get(message.channel.id)
    
            if(args[0] === '--files'){
                if(!fsnipes) return await message.channel.send("There's nothing to remove")
                const fsnipe = +args[1] - 1 || 0
                fsnipes[fsnipe] = null
                return await message.react('✅')
            } else if(args[0] === '--user'){
                if(!usnipes) return await message.channel.send("There's nothing to remove")
                const usnipe = +args[1] - 1 || 0
                usnipes[usnipe] = null
                await message.react('✅')
            } else if(args[0] === '--edit') {
                if(!esnipes) return await message.channel.send("There's nothing to remove")
                const esnipe = +args[0] - 1 || 0
                esnipes[esnipe] = null
                await message.react('✅')
            } else {
                if(!snipes) return await message.channel.send("There's nothing to remove")
                const snipe = +args[0] - 1 || 0
                snipes[snipe] = null
                await message.react('✅')
            }
        } catch (error) {
            console.log(`Error on removesnipe.js - ${error}`)
        }
    }
}