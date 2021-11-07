const { Client, Message, MessageEmbed, Permissions } = require('discord.js')
const moment = require('moment')

module.exports = {
    name: 'usereditsnipe',
    aliases: ['ues', 'uesnipe'],

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
            const uesnipes = client.uesnipes.get(message.channel.id)
            if(!uesnipes) return await message.channel.send("There's nothing to snipe")
    
            const uesnipe = +args[1] - 1 || 0
            const target = uesnipes[uesnipe]
    
            if(!target) return await message.channel.send("There's nothing to snipe")
    
            const { oldmsg, newmsg, time, img } = target

            const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                .setLabel('Context')
                .setURL(newmsg.url)
                .setStyle('LINK')
            )
    
            if(oldmsg.author.id !== user.id) return await message.channel.send("There's nothing to snipe")
    
            const embed = new MessageEmbed()
            .setAuthor(oldmsg.author.tag, oldmsg.author.displayAvatarURL())
            .addField('Before', `${oldmsg.content}` || '[no text]')
            .addField('After', `${newmsg.content}` || '[no text]')
            .setImage(img)
            .setFooter(`${moment(time).fromNow()} | ${uesnipe + 1}/${uesnipes.length}`)
            .setColor('RANDOM')
    
            await message.channel.send({ embeds: [embed], components: [row] })
        } catch (error) {
            console.log(`Error on useresnipe.js - ${error}`)
        }
    }
}