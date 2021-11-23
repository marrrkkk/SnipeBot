const { Client, Message } = require('discord.js')
const { ownerID, emojis } = require('../../config.json')

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

            const err = new MessageEmbed()
            .setDescription(`${emojis.cross} Provide a valid server ID`)
            .setColor('RED')

            const err2 = new MessageEmbed()
            .setDescription(`${emojis.cross} Unable to find server "**${args[0]}**"`)
            .setColor('RED')

            if(!args[0]) return await message.channel.send({ embeds: [err] })
            if(!guild) return await message.channel.send({ embeds: [err2] })
    
            await guild.leave()
            await message.channel.send(`Successfully leave from **${guild.name}**`)
        } catch (error) {
            console.log(error)
        }
    }
}