const { Client, Message, MessageEmbed, Permissions } = require('discord.js')
const moment = require('moment')

module.exports = {
    name: 'botsnipe',
    aliases: ['bs', 'bsnipe'],

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
        ])) return await message.channel.send('Missing Permission: `EMBED_LINKS`')
        
        try {
            const bsnipes = client.bsnipes.get(message.channel.id)
            if(!bsnipes) return await message.channel.send("There's nothing to snipe")
    
            const bsnipe = +args[0] - 1 || 0
            const target = bsnipes[bsnipe]
    
            if(!target) return await message.channel.send(`There's only ${bsnipes.length} messages to snipe`)
    
            const { msg, time, img, embeds } = target
    
            if(embeds){
                const embed = new MessageEmbed(embeds)
                return await message.channel.send({ content: `Original message from: **${msg.author.username}** - <t:${Math.floor(time / 1000)}:R>`, embeds: [embed] }).catch(e => console.log(e))
            } else {
                const embed = new MessageEmbed()
                .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
                .setDescription(msg.content || '[embed]')
                .setImage(img)
                .setFooter(`${moment(time).fromNow()} | ${bsnipe + 1}/${bsnipes.length}`)
                .setColor('RANDOM')
        
                return await message.channel.send({ embeds: [embed] }).catch(e => console.log(e))
            }
        } catch (error) {
            console.log(error)
        }
    }
}