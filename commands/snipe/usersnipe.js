const { Client, Message, MessageEmbed, Permissions } = require('discord.js')
const moment = require('moment')

module.exports = {
    name: 'usersnipe',
    aliases: ['us', 'usnipe'],

    /**
     * @param {Client} client
     * @param {Message} message
     * @param {String[]} args
     */

    run: async(client, message, args) => {
        const channel = message.channel;
        const botPermissionsIn = message.guild.me.permissionsIn(channel);
        if(!botPermissionsIn.has([
            Permissions.FLAGS.EMBED_LINKS
        ])) return message.channel.send('Missing Permission: `EMBED_LINKS`')
        
        try {
            const user = message.mentions.members.first()
            if(!user) return
            const usnipes = client.usnipes.get(message.channel.id)
            if(!usnipes) return await message.channel.send("There's nothing to snipe")
    
            const usnipe = +args[1] - 1 || 0
            const target = usnipes[usnipe]
    
            if(usnipe > usnipes.length) return await message.channel.send(`There's only ${usnipes.length} message to snipe`)
            if(!target){
                const embed = new MessageEmbed()
                .setDescription('This snipe has been removed')
                .setColor('#2f3136')
    
                return await message.channel.send({ embeds: [embed] })
            }
    
            const { msg, time, img } = target
    
            if(msg.author.id !== user.id) return await message.channel.send("There's nothing to snipe")
    
            const embed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setDescription(msg.content || '[no text]')
            .setImage(img)
            .setFooter(`${moment(time).fromNow()} | ${usnipe + 1}/${usnipes.length}`)
            .setColor('RANDOM')
    
            await message.channel.send({ embeds: [embed] })
        } catch (error) {
            console.log(`Error on usersnipe.js - ${error}`)
        }
    }
}