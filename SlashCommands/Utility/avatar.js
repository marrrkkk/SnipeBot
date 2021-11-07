const { Client, CommandInteraction, MessageEmbed } = require('discord.js')

module.exports = {
    name: 'avatar',
    description: "Display member's avatar",
    type: 'CHAT_INPUT',
    options: [
        {
            name: 'user',
            description: 'Optional',
            type: 6,
            required: false
        }
    ],

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */

    run: async(client, interaction) => {
        try {
            await interaction.deferReply({ ephemeral: true }).catch(() => {});
            const options = interaction.options._hoistedOptions
            const user = (options.find((e) => e.name === 'user') && options.find((e) => e.name === 'user').member.user) || interaction.user
            const member = (options.find((e) => e.name === 'user') && options.find((e) => e.name === 'user').member) || interaction.user

            const embed = new MessageEmbed()
            .setAuthor(user.tag, user.displayAvatarURL())
            .setImage(user.displayAvatarURL({ dynamic: true, size: 4096}))
            .setColor(member.displayHexColor)
            .setTimestamp()

            await interaction.followUp({ embeds: [embed] })
        } catch (error) {
            console.log(error)
        }
    }
}