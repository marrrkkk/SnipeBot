const { Client, CommandInteraction, MessageEmbed, MessageActionRow, MessageButton } = require('discord.js')

module.exports = {
    name: 'clear-snipe',
    description: "Remove all snipe in current channel",

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */

    run: async(client, interaction) => {
        try {
            await interaction.deferReply({ ephemeral: false }).catch(() => {});
            const member = interaction.guild.members.cache.get(interaction.user.id)
            if(!member.permissions.has('ADMINISTRATOR')) return interaction.editReply("<:cross:893700435616100402> You don't have permission to use this command")
            const channel = interaction.channel
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

            const embed = new MessageEmbed()
            .setAuthor('Clear Snipe',interaction.user.displayAvatarURL())
            .setDescription(`Are you sure you want to delete all snipes in ${channel}`)

            let msg = await interaction.editReply({ embeds: [embed], components: [row] })
            const collector = msg.createMessageComponentCollector({ componentType: 'BUTTON'})

            collector.on('collect', async b => {
                b.deferUpdate()
                if(b.user.id !== interaction.user.id) return
                if(b.customId === 'confirm'){
                    row.components[0].setDisabled(true)
                    row.components[1].setDisabled(true)

                    const confirm = new MessageEmbed()
                    .setAuthor('Clear Snipe', interaction.user.displayAvatarURL())
                    .setDescription(`All snipes have been deleted in ${channel}`)
                    .setColor('GREEN')

                    await client.snipes.delete(interaction.channel.id)
                    await client.esnipes.delete(interaction.channel.id)
                    await client.bsnipes.delete(interaction.channel.id)
                    await client.besnipes.delete(interaction.channel.id)
                    await client.psnipes.delete(interaction.channel.id)
                    await client.ebsnipes.delete(interaction.channel.id)
                    await client.usnipes.delete(interaction.channel.id)
                    await client.uesnipes.delete(interaction.channel.id)
                    await client.rsnipes.delete(interaction.channel.id)

                    await msg.edit({ embeds: [confirm], components: [row] })
                }

                if(b.customId === 'cancel'){
                    row.components[0].setDisabled(true)
                    row.components[1].setDisabled(true)

                    const cancel = new MessageEmbed()
                    .setAuthor('Clear Snipe', interaction.user.displayAvatarURL())
                    .setDescription(`Cancelled.`)
                    .setColor('GREY')

                    await msg.edit({ embeds: [cancel], components: [row] })
                }
            })
        } catch (error) {
            console.log(error)
        }
    }
}