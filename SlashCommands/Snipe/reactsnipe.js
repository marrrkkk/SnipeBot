const { Client, CommandInteraction, MessageEmbed } = require('discord.js')
const moment = require('moment')

module.exports = {
    name: 'reactsnipe',
    description: "Snipe recently removed reactions",
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
            const rsnipes = client.rsnipes.get(interaction.channel.id)
            if(!rsnipes) return await interaction.editReply("There's nothing to snipe")

            let num = interaction.options.getInteger("number")
            if(!num) num = 1
            const rsnipe = +num - 1 || 0
            const target = rsnipes[rsnipe]
    
            if(!target) return await interaction.editReply("There's nothing to snipe")
    
            const { author, time, img, msg } = target

            const embed = new MessageEmbed()
            .setAuthor(author.tag, author.displayAvatarURL())
            .setDescription(`${msg}`)
            .setImage(img)
            .setFooter(`${moment(time).fromNow()} | ${rsnipe + 1}/${rsnipes.length}`)
            .setColor('RANDOM')

            await interaction.followUp({ embeds: [embed] })
        } catch (error) {
            console.log(error)
        }
    }
}