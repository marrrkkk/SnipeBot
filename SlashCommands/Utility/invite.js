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
            const embed = new MessageEmbed()
            .setTitle('<:plus:897118884539277383> Want to invite Snipe?')
            .setDescription('Invite me by clicking the button below')
            .addField('🔗 Additional links', '[Github](https://github.com/yayeen)\n[Vote for Snipe](https://top.gg/bot/884249240090607637/vote)\n[Invite Snipe 2](https://discord.com/oauth2/authorize?client_id=890221078532726814&scope=applications.commands+bot&permissions=8)')
            .setThumbnail(client.user.displayAvatarURL())
            .setColor('BLURPLE')

            await interaction.editReply({ embeds: [embed], components: [row] })
        } catch (error) {
            console.log(error)
        }
    }
}