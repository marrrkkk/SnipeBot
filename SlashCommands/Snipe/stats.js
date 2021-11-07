const { Client, CommandInteraction, MessageEmbed } = require('discord.js')

module.exports = {
    name: 'stats',
    description: "Display stats for deleted/edited message in current channel",
    type: 'CHAT_INPUT',

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */

    run: async(client, interaction) => {
        try {
            await interaction.deferReply({ ephemeral: false }).catch(() => {});
            const channel = interaction.channel
            let snipes = client.snipes.get(interaction.channel.id)
            let esnipes = client.esnipes.get(interaction.channel.id)
            let bsnipes = client.bsnipes.get(interaction.channel.id)
            let besnipes = client.besnipes.get(interaction.channel.id)
            let emsnipes = client.emsnipes.get(interaction.channel.id)
            let rsnipes = client.rsnipes.get(interaction.channel.id)
    
            let del
            let edit
            let botdel
            let botedit
            let ems
            let react
    
            if(!snipes){
                del = 0
            } else {
                del = snipes.length
            }
    
            if(!esnipes){
                edit = 0
            } else {
                edit = esnipes.length
            }
    
            if(!bsnipes){
                botdel = 0
            } else {
                botdel = bsnipes.length
            }
    
            if(!besnipes){
                botedit = 0
            } else {
                botedit = besnipes.length
            }

            if(!emsnipes){
                ems = 0
            } else {
                ems = emsnipes.length
            }

            if(!rsnipes){
                react = 0
            } else {
                react = rsnipes.length
            }
    
            const embed = new MessageEmbed()
            .setAuthor(`Stats for #${channel.name}`, interaction.user.displayAvatarURL())
            .setDescription(`> **Deleted Msg:** ${del}/20\n> **Edited Msg:** ${edit}/20\n> **Bot Deleted Msg:** ${botdel}/20\n> **Bot Edited Msg:** ${botedit}/20\n> **Deleted Embed** ${ems}/20\n> **Reaction Removed:** ${react}/20`)
            .setColor('#2f3136')
            .setFooter('Note: It will reset if the bot goes offline')

            await interaction.followUp({ embeds: [embed] })
        } catch (error) {
            console.log(error)
        }
    }
}