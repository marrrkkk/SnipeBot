const { Client, Message, MessageEmbed } = require('discord.js')
const { emojis } = require('../../config.json')

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
            let Member = message.mentions.members.first() || message.guild.members.cache.get(args[0]) ||
            message.guild.members.cache.find(m => m.user.username === args.join(' ')) || message.guild.members.cache.find(m => m.user.username.toLowerCase() === args.join(' ')) ||
            message.guild.members.cache.find(m => m.displayName === args.join(' ')) || message.guild.members.cache.find(m => m.displayName.toLowerCase() === args.join(' '))
            if(!args[0]) Member = message.member

            const err = new MessageEmbed()
            .setDescription(`${emojis.cross} Could't find member "**${args.join(' ')}**"`)
            .setColor('RED')
            
            if(!Member) return message.channel.send({ embeds: [err] })
    
            const embed = new MessageEmbed()
            .setAuthor(Member.user.tag, Member.user.displayAvatarURL())
            .setDescription(`[Avatar](${Member.user.displayAvatarURL()})`)
            .setImage(Member.user.displayAvatarURL({dynamic: true, size: 512}))
            .setColor(Member.displayHexColor)
    
            await message.channel.send({ embeds: [embed] }).catch(e => console.log(e))
        } catch (error) {
            console.log(error)
        }
    }
}