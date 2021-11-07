const { Client, CommandInteraction, MessageEmbed } = require('discord.js')
const moment = require('moment')

module.exports = {
    name: 'ping-snipe',
    description: "Snipe deleted message that mentioned you",
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
            const psnipes = client.psnipes.get(interaction.channel.id)
            if(!psnipes) return await interaction.editReply("There's nothing to snipe")

            let num = interaction.options.getInteger("number")
            if(!num) num = 1
            const psnipe = +num - 1 || 0
            const target = psnipes[psnipe]
    
            if(!target) return await interaction.editReply("There's nothing to snipe")
    
            const { msg, time, img, ping } = target
    
            if(ping.id !== interaction.user.id) return await interaction.editReply("There's nothing to snipe")
    
            const embed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .addField('Mention', `${ping}`)
            .addField('Content', `${msg.content}` || '[no text]')
            .setImage(img)
            .setFooter(`${moment(time).fromNow()} | ${psnipe + 1}/${psnipes.length}`)
            .setColor('RANDOM')

            await interaction.followUp({ embeds: [embed] })
        } catch (error) {
            console.log(error)
        }
    }
}