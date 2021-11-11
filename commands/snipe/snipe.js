const { Client, Message, MessageEmbed, Permissions, MessageAttachment } = require('discord.js')
const moment = require('moment')

module.exports = {
    name: 'snipe',
    aliases: ['s'],

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
            const snipes = client.snipes.get(message.channel.id)
            if(!snipes) return await message.channel.send("There's nothing to snipe")
    
            const snipe = +args[0] - 1 || 0
            const target = snipes[snipe]
    
            if(snipe > snipes.length) return await message.channel.send(`There's only ${snipes.length} message to snipe`)
            if(!target){
                const embed = new MessageEmbed()
                .setDescription('This snipe has been removed')
                .setColor('#2f3136')
    
                return await message.channel.send({ embeds: [embed] }).catch(e => console.log(e))
            }
    
            const { msg, time, url, img, type } = target
    
            if(!url){
                const embed = new MessageEmbed()
                .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
                .setDescription(`${msg.content}` || '[no content]')
                .setImage(img)
                .setFooter(`${moment(time).fromNow()} | ${snipe + 1}/${snipes.length}`)
                .setColor('RANDOM')

                if(msg.mentions.repliedUser){
                    embed.addField('Replied to:', `${msg.mentions.repliedUser}`)
                }
    
                return await message.channel.send({ embeds: [embed] }).catch(e => console.log(e))
            } else {
                const embed = new MessageEmbed()
                .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
                .setDescription(`${msg.content}\n\n[Attachment](${url})`)
                .setImage(img)
                .setFooter(`${moment(time).fromNow()} | ${snipe + 1}/${snipes.length}`)
                .setColor('RANDOM')

                if(msg.mentions.repliedUser){
                    embed.addField('Replied to:', `${msg.mentions.repliedUser}`)
                }
    
                if(type){
                    if(!type.startsWith('image')){
                        const file = new MessageAttachment(url)
                        return await message.channel.send({ embeds: [embed], files: [file] })
                    } else {
                        return await message.channel.send({ embeds: [embed] })
                    }
                } else if (type === null){
                    const file = new MessageAttachment(url)
                    return await message.channel.send({ embeds: [embed], files: [file] })
                } else {
                    return await message.channel.send('Unknown Message')
                }
            }
        } catch (error) {
            console.log(`Error on snipe.js - ${error}`)
        }
    }
}