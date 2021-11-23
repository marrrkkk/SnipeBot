const { Client, Message, MessageActionRow, MessageButton, MessageEmbed, Permissions } = require('discord.js')
const { emojis } = require('../../config.json')

module.exports = {
    name: 'clearsnipe',
    aliases: ['cs', 'csnipe'],

    /**
     * @param {Client} client
     * @param {Message} message
     * @param {String[]} args
     */

    run: async(client, message, args) => {
        const channel = message.channel;

        const err = new MessageEmbed()
        .setDescription(`${emojis.cross} You don't have permission.`)
        .setColor('RED')

        const botPermissionsIn = message.guild.me.permissionsIn(channel);
        if(!botPermissionsIn.has([
            Permissions.FLAGS.EMBED_LINKS
        ])) return message.channel.send(`${emojis.cross} Missing Permission: \`EMBED_LINKS\``)  
        
        if(!message.member.permissions.has('ADMINISTRATOR')) return await message.channel.send({ embeds: [err] })
        
        const row = new MessageActionRow()
        .addComponents(
            new MessageButton()
            .setCustomId('confirm')
            .setLabel('Delete')
            .setStyle('DANGER')
        )
        .addComponents(
            new MessageButton()
            .setCustomId('cancel')
            .setLabel('Cancel')
            .setStyle('SECONDARY')
        )
        try {
            const embed = new MessageEmbed()
            .setAuthor('Clear Snipe', message.author.displayAvatarURL())
            .setDescription(`Are you sure you want to delete all snipes in ${channel}`)

            let msg = await message.channel.send({ embeds: [embed], components: [row] })
            const collector = msg.createMessageComponentCollector({ componentType: 'BUTTON'})

            collector.on('collect', async b => {
                try {
                    await b.deferUpdate()
                    if(b.user.id !== message.author.id) return
                    if(b.customId === 'confirm'){
                        await row.components[0].setDisabled(true)
                        await row.components[1].setDisabled(true)
    
                        const confirm = new MessageEmbed()
                        .setAuthor('Clear Snipe', message.author.displayAvatarURL())
                        .setDescription(`All snipes have been deleted in ${channel}`)
                        .setColor('GREEN')
    
                        await client.snipes.delete(message.channel.id)
                        await client.esnipes.delete(message.channel.id)
                        await client.bsnipes.delete(message.channel.id)
                        await client.besnipes.delete(message.channel.id)
                        await client.psnipes.delete(message.channel.id)
                        await client.ebsnipes.delete(message.channel.id)
                        await client.usnipes.delete(message.channel.id)
                        await client.rsnipes.delete(message.channel.id)
                        await client.fsnipes.delete(message.channel.id)
                        await client.emsnipes.delete(message.channel.id)
    
                        await msg.edit({ embeds: [confirm], components: [row] })
                    }
    
                    if(b.customId === 'cancel'){
                        await row.components[0].setDisabled(true)
                        await row.components[1].setDisabled(true)
    
                        const cancel = new MessageEmbed()
                        .setAuthor('Clear Snipe', message.author.displayAvatarURL())
                        .setDescription(`Cancelled.`)
                        .setColor('GREY')
    
                        await msg.edit({ embeds: [cancel], components: [row] })
                    }
                } catch (error) {
                    console.log(`Error on clearsnipe.js collector.on() - ${error}`)
                }
            })
        } catch (error) {
            console.log(`Error on clearsnipe.js - ${error}`)
        }
    }
}