const { Client, Message, MessageEmbed, Permissions, MessageActionRow, MessageButton } = require('discord.js')
const moment = require('moment')

module.exports = {
    name: 'rsnipe',
    aliases: ['rs', 'reactsnipe'],

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
            const rsnipes = client.rsnipes.get(message.channel.id)
            if(!rsnipes) return await message.channel.send("There's nothing to snipe")
    
            const rsnipe = +args[0] - 1 || 0
            const target = rsnipes[rsnipe]
    
            if(!target) return await message.channel.send(`There's only ${rsnipes.length} messages to snipe`)
    
            const { author, time, img, msg, link } = target

            const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                .setLabel('Context')
                .setURL(link)
                .setStyle('LINK')
            )
    
            const embed = new MessageEmbed()
            .setAuthor(author.tag, author.displayAvatarURL())
            .setDescription(`${msg}`)
            .setImage(img)
            .setFooter(`${moment(time).fromNow()} | ${rsnipe + 1}/${rsnipes.length}`)
            .setColor('RANDOM')
    
            await message.channel.send({ embeds: [embed], components: [row] })
        } catch (error) {
            console.log(`Error on reactsnipe.js - ${error}`)
        }
    }
}