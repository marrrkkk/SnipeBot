const { Client, CommandInteraction, MessageEmbed, MessageActionRow, MessageButton } = require('discord.js')

module.exports = {
    name: 'invite',
    description: 'Invite me in your server',

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */

    run: async(client, interaction, args) => {
        try {
            await interaction.deferReply({ ephemeral: true }).catch(() => {});
            const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                .setLabel('Invite')
                .setURL('https://discord.com/oauth2/authorize?client_id=884249240090607637&scope=applications.commands+bot&permissions=380104984640')
                .setStyle('LINK')
            )
            .addComponents(
                new MessageButton()
                .setLabel('Support Server')
                .setURL('https://discord.gg/WEZkASkcH8')
                .setStyle('LINK')
            )

            await interaction.editReply({ content: 'Invite **Snipe** to your server!', components: [row] })
        } catch (error) {
            console.log(error)
        }
    }
}