const { Client, Message, MessageEmbed, Permissions, MessageActionRow, MessageButton } = require('discord.js')
const { emojis } = require('../../config.json')
const moment = require('moment')

module.exports = {
    name: 'editsnipe',
    aliases: ['es', 'esnipe'],

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
            const esnipes = client.esnipes.get(message.channel.id)
            if(!esnipes) return await message.channel.send("There's nothing to snipe")
    
            const esnipe = +args[0] - 1 || 0
            const target = esnipes[esnipe]
    
            if(esnipe > esnipes.length) return await message.channel.send(`There's only ${esnipes.length} message to snipe`)
            if(!target){
                const embed = new MessageEmbed()
                .setDescription('This snipe has been removed')
                .setColor('#2f3136')
    
                return await message.channel.send({ embeds: [embed] }).catch(e => console.log(e))
            }
    
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
            .addField('Before', `${oldmsg.content}` || '[no text]')
            .addField('After', `${newmsg.content}` || '[no text]')
            .setImage(img)
            .setFooter(`${moment(time).fromNow()} | ${esnipe + 1}/${esnipes.length}`)
            .setColor('RANDOM')
    
            await message.channel.send({ embeds: [embed], components: [row] })
        } catch (error) {
            console.log(`Error on esnipe.js - ${error}`)
        }
    }
}