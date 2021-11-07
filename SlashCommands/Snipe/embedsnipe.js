const { Client, CommandInteraction, MessageEmbed, MessageAttachment } = require('discord.js')
const moment = require('moment')

module.exports = {
    name: 'embed-snipe',
    description: "Snipe recently deleted embeds",
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
            const emsnipes = client.emsnipes.get(interaction.channel.id)
            if(!emsnipes) return await interaction.editReply("There's nothing to snipe")

            let num = interaction.options.getInteger("number")
            if(!num) num = 1
            const emsnipe = +num - 1 || 0
            const target = emsnipes[emsnipe]
    
            if(!target) return await interaction.editReply("There's nothing to snipe")

            const { msg, time, embed } = target

            const snipe = new MessageEmbed(embed)

            await interaction.editReply({ content: `Original message from: **${msg.author.username}** - <t:${Math.floor(time / 1000)}:R>`, embeds: [snipe] })
        } catch (error) {
            console.log(error)
        }
    }
}