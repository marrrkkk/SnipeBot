const { Client, Message, MessageEmbed } = require('discord.js')

module.exports = {
    name: 'avatar',
    aliases: ['av'],

    /**
     * @param {Client} client
     * @param {Message} message
     * @param {String[]} args
     */

    run: async(client, message, args) => {
        try {
            let user = message.mentions.users.first() || message.guild.members.cache.get(args[0]) || 
            message.guild.members.cache.find(m => m.user.username === args.join(' ')) || message.guild.members.cache.find(m => m.user.username.toLowerCase() === args.join(' ')) ||
            message.guild.members.cache.find(m => m.displayName === args.join(' ')) || message.guild.members.cache.find(m => m.displayName.toLowerCase() === args.join(' '))
            if(!args[0]) user = message.member
            if(!user) return message.channel.send(`Unable find member "${args.join(' ')}"`)
    
            const embed = new MessageEmbed()
            .setAuthor(user.user.tag, user.user.displayAvatarURL())
            .setImage(user.user.displayAvatarURL({ dynamic: true, size: 512}))
            .setColor(user.displayHexColor)
            .setTimestamp()
    
            await message.channel.send({ embeds: [embed] }).catch(e => console.log(e))
        } catch (error) {
            console.log(error)
        }
    }
}