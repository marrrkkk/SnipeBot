const { Client, Message, MessageAttachment, Permissions, MessageEmbed } = require('discord.js')
const moment = require('moment')

module.exports = {
    name: 'filesnipe',
    aliases: ['fs', 'fsnipe'],

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
            const fsnipes = client.fsnipes.get(message.channel.id)
            if(!fsnipes) return await message.channel.send("There's nothing to snipe")
    
            const fsnipe = +args[0] - 1 || 0
            const target = fsnipes[fsnipe]
    
            if(fsnipe > fsnipes.length) return await message.channel.send(`There's only ${fsnipes.length} message to snipe`)
            if(!target){
                const embed = new MessageEmbed()
                .setDescription('This snipe has been removed')
                .setColor('#2f3136')
    
                return await message.channel.send({ embeds: [embed] })
            }
    
            const { msg, time, attachment, type } = target
    
            const file = new MessageAttachment(attachment)
            const embed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setDescription(`${msg.content}\n\n**File type:** ${type} <:fileupload:902027655862427668>`)
            .setFooter(`${moment(time).fromNow()} | ${fsnipe + 1}/${fsnipes.length}`)
            .setColor('#2f3136')
    
            await message.channel.send({ embeds: [embed], files: [file] })
        } catch (error) {
            console.log(`Error on filesnipe.js - ${error}`)
        }
    }
}