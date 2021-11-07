const { Client, CommandInteraction, MessageEmbed, MessageAttachment } = require('discord.js')
const moment = require('moment')

module.exports = {
    name: 'file-snipe',
    description: "Snipe recently deleted attachment/file",
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
            const fsnipes = client.fsnipes.get(interaction.channel.id)
            if(!fsnipes) return await interaction.editReply("There's nothing to snipe")

            let num = interaction.options.getInteger("number")
            if(!num) num = 1
            const fsnipe = +num - 1 || 0
            const target = fsnipes[fsnipe]
    
            if(!target) return await interaction.editReply("There's nothing to snipe")

            const { msg, time, attachment, type } = target
    
            const file = new MessageAttachment(attachment)
            const embed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setDescription(`${msg.content}\n\n**File type:** ${type} <:fileupload:902027655862427668>`)
            .setFooter(`${moment(time).fromNow()} | ${fsnipe + 1}/${fsnipes.length}`)
            .setColor('#2f3136')

            await interaction.editReply({ embeds: [embed], files: [file] })
        } catch (error) {
            console.log(error)
        }
    }
}
