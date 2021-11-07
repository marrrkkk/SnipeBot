const { Client, CommandInteraction, MessageEmbed } = require('discord.js')
const moment = require('moment')

module.exports = {
    name: 'editsnipe',
    description: "Snipe recently edited message",
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
            const esnipes = client.esnipes.get(interaction.channel.id)
            if(!esnipes) return await interaction.editReply("There's nothing to snipe")

            let num = interaction.options.getInteger("number")
            if(!num) num = 1
            const esnipe = +num - 1 || 0
            const target = esnipes[esnipe]
    
            if(!target) return await interaction.editReply("There's nothing to snipe")
    
            const { oldmsg, newmsg, time, img } = target

            const embed = new MessageEmbed()
            .setAuthor(oldmsg.author.tag, oldmsg.author.displayAvatarURL())
            .addField('Before', `${oldmsg.content}` || '[no text]')
            .addField('After', `${newmsg.content}` || '[no text]')
            .setImage(img)
            .setFooter(`${moment(time).fromNow()} | ${esnipe + 1}/${esnipes.length}`)
            .setColor('RANDOM')

            await interaction.followUp({ embeds: [embed] })
        } catch (error) {
            console.log(error)
        }
    }
}