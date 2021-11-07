const { Client, Message } = require('discord.js')
const { ownerID } = require('../../config.json')

module.exports = {
    name: 'leave',

    /**
     * @param {Client} client
     * @param {Message} message
     * @param {String[]} args
     */

    run: async(client, message, args) => {
        if(message.author.id !== ownerID) return
        try {
            const guild = client.guilds.cache.get(args[0]) || client.guilds.cache.find(g => g.name.toLowerCase() === args.join(' '))
            if(!args[0]) return await message.channel.send('<:cross:893700435616100402> Provide a Server ID')
            if(!guild) return await message.channel.send(`<:cross:893700435616100402> Unable to find server "${args[0]}"`)
    
            await guild.leave()
            await message.channel.send(`Successfully leave from **${guild.name}**`)
        } catch (error) {
            console.log(error)
        }
    }
}