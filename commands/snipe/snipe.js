const { Client, Message, MessageEmbed, Permissions, MessageAttachment } = require('discord.js')
const { emojis } = require('../../config.json')
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
        ])) return message.channel.send(`${emojis.cross} Missing Permission: \`EMBED_LINKS\``)

        try {
            const channel = message.mentions.channels.first() || message.channel
            const snipes = client.snipes.get(channel.id)
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
    
            const { msg, time, url, img, type, stkname, stk } = target
    
            if(!url){
                const embed = new MessageEmbed()
                .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
                .setDescription(`${msg.content || `[${stkname}](${stk})`}` || '[no content]')
                .setImage(img)
                .setFooter(`${moment(time).fromNow()} | ${snipe + 1}/${snipes.length}`)
                .setColor('RANDOM')

                //Check if reply
                if(msg.mentions.repliedUser){
                    embed.addField('Replied to:', `${msg.mentions.repliedUser}`)
                }

                //Check if from another channel
                if(channel.id !== message.channel.id){
                    embed.addField('Channel:', `${channel}`)
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