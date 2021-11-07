const { Client, CommandInteraction, MessageEmbed } = require('discord.js')
const moment = require('moment')

module.exports = {
    name: 'user-snipe',
    description: "Snipe target deleted message",
    type: 'CHAT_INPUT',
    options: [
        {
            name: 'user',
            description: 'Target',
            type: 6,
            required: true
        },
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
            const options = interaction.options._hoistedOptions
            const user = (options.find((e) => e.name === 'user') && options.find((e) => e.name === 'user').member.user) || interaction.user
            const member = (options.find((e) => e.name === 'user') && options.find((e) => e.name === 'user').member) || interaction.user

            const usnipes = client.usnipes.get(interaction.channel.id)
            if(!usnipes) return await interaction.editReply("There's nothing to snipe")

            let num = interaction.options.getInteger("number")
            if(!num) num = 1
            const usnipe = +num - 1 || 0
            const target = usnipes[usnipe]
    
            if(!target) return await interaction.editReply("There's nothing to snipe")
    
            const { msg, time, img } = target
    
            if(msg.author.id !== member.id) return await interaction.editReply("There's nothing to snipe")
    
            const embed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setDescription(msg.content || '[no text]')
            .setImage(img)
            .setFooter(`${moment(time).fromNow()} | ${usnipe + 1}/${usnipes.length}`)
            .setColor('RANDOM')

            await interaction.followUp({ embeds: [embed] })
        } catch (error) {
            console.log(error)
        }
    }
}