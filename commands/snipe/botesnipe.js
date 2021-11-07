const { Client, Message, MessageEmbed, Permissions, MessageActionRow, MessageButton } = require('discord.js')
const moment = require('moment')

module.exports = {
    name: 'boteditsnipe',
    aliases: ['bes', 'besnipe'],

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
            const besnipes = client.besnipes.get(message.channel.id)
            if(!besnipes) return await message.channel.send("There's nothing to snipe")
    
            const besnipe = +args[0] - 1 || 0
            const target = besnipes[besnipe]
    
            if(!target) return await message.channel.send(`There's only ${besnipes.length} messages to snipe`)
    
            const { oldmsg, newmsg, time, img } = target

            const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                .setLabel('Context')
                .setURL(newmsg.url)
                .setStyle('LINK')
            )
    
            const embed = new MessageEmbed()
            .setAuthor(oldmsg.author.tag, oldmsg.author.displayAvatarURL())
            .addField('Before', `${oldmsg.content}` || '[embed]')
            .addField('After', `${newmsg.content}` || '[embed]')
            .setImage(img)
            .setFooter(`${moment(time).fromNow()} | ${besnipe + 1}/${besnipes.length}`)
            .setColor('RANDOM')
    
            await message.channel.send({ embeds: [embed], components: [row] }).catch(e => console.log(e))
        } catch (error) {
            console.log(`Error on boteditsnipe - ${error}`)
        }
    }
}