const { Client, Message, MessageEmbed, Permissions } = require('discord.js')
const moment = require('moment')

module.exports = {
    name: 'pingsnipe',
    aliases: ['ps', 'psnipe'],

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
            const psnipes = client.psnipes.get(message.channel.id)
            if(!psnipes) return await message.channel.send("There's nothing to snipe")
    
            const psnipe = +args[0] - 1 || 0
            const target = psnipes[psnipe]
    
            if(!target) return await message.channel.send(`There's only ${psnipes.length} messages to snipe`)
    
            const { msg, time, img } = target
    
            const embed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setDescription(`${msg.content}` || '[no text]')
            .setImage(img)
            .setFooter(`${moment(time).fromNow()} | ${psnipe + 1}/${psnipes.length}`)
            .setColor('RANDOM')

            if(msg.mentions.repliedUser){
                embed.addField('Replied to:', `${msg.mentions.repliedUser}`)
            }
    
            await message.channel.send({ embeds: [embed] })
        } catch (error) {
            console.log(`Error on pingsnipe.js - ${error}`)
        }
    }
}