const { Client, Message, MessageEmbed, Permissions } = require('discord.js')
const { emojis } = require('../../config.json')
const moment = require('moment')

module.exports = {
    name: 'aim',

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
            const user = message.mentions.members.first()
            if(!user) return await message.reply('Please mention a target.')
            const usnipes = client.usnipes.get(user.id)
            if(!usnipes) return await message.channel.send(`**${user.displayName}** does not have any deleted messages in my history.`)
    
            const usnipe = +args[1] - 1 || 0
            const target = usnipes[usnipe]
    
            if(usnipe > usnipes.length) return await message.channel.send(`There's only ${usnipes.length} message to snipe`)
            if(!target){
                const embed = new MessageEmbed()
                .setDescription('This snipe has been removed')
                .setColor('#2f3136')
    
                return await message.channel.send({ embeds: [embed] })
            }
    
            const { msg, time, img, stk, stkname } = target
    
            const embed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setDescription(`${msg.content || `[${stkname}](${stk})`}` || '[no text]')
            .addField('Channel:', `${msg.channel}`)
            .setImage(img)
            .setFooter(`${moment(time).fromNow()} | ${usnipe + 1}/${usnipes.length}`)
            .setColor('RANDOM')

            if(msg.mentions.repliedUser){
                embed.addField('Replied to:', `${msg.mentions.repliedUser}`)
            }
    
            await message.channel.send({ embeds: [embed] })
        } catch (error) {
            console.log(`Error on usersnipe.js - ${error}`)
        }
    }
}