const { Client, CommandInteraction, MessageEmbed, MessageAttachment } = require('discord.js')
const moment = require('moment')

module.exports = {
    name: 'snipe',
    description: "Snipe recently deleted message",
    type: 'CHAT_INPUT',
    options: [
        {
            name: 'number',
            description: 'Optional',
            type: "INTEGER",
            required: false
        }
    ],

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */

    run: async(client, interaction) => {
        try {
            await interaction.deferReply({ ephemeral: false }).catch(() => {});
            const snipes = client.snipes.get(interaction.channel.id)
            if(!snipes) return await interaction.editReply("There's nothing to snipe")

            let num = interaction.options.getInteger("number")
            if(!num) num = 1
            const snipe = +num - 1 || 0
            const target = snipes[snipe]
    
            if(snipe > snipes.length) return interaction.editReply(`There's only ${snipes.length} message to snipe`)
            if(!target){
                const embed = new MessageEmbed()
                .setDescription('This snipe has been removed')
                .setColor('#2f3136')
    
                return await interaction.editReply({ embeds: [embed] }).catch(e => console.log(e))
            }
    
            const { msg, time, url, img, type } = target
    
            if(!url){
                const embed = new MessageEmbed()
                .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
                .setDescription(`${msg.content}` || '[no content]')
                .setImage(img)
                .setFooter(`${moment(time).fromNow()} | ${snipe + 1}/${snipes.length}`)
                .setColor('RANDOM')
    
                return interaction.editReply({ embeds: [embed] }).catch(e => console.log(e))
            } else {
                const embed = new MessageEmbed()
                .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
                .setDescription(`${msg.content}\n\n[Attachment](${url})`)
                .setImage(img)
                .setFooter(`${moment(time).fromNow()} | ${snipe + 1}/${snipes.length}`)
                .setColor('RANDOM')
    
                if(type){
                    if(!type.startsWith('image')){
                        const file = new MessageAttachment(url)
                        return interaction.editReply({ embeds: [embed], files: [file] }).catch(e => console.log(e))
                    } else {
                        return interaction.editReply({ embeds: [embed] }).catch(e => console.log(e))
                    }
                } else if (type === null){
                    const file = new MessageAttachment(url)
                    return interaction.editReply({ embeds: [embed], files: [file] }).catch(e => console.log(e))
                } else {
                    return interaction.editReply('Unknown Message')
                }
            }
        } catch (error) {
            console.log(error)
        }
    }
}