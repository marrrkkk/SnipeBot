const { Client, CommandInteraction, MessageEmbed } = require('discord.js')
const moment = require('moment')

module.exports = {
    name: 'user-editsnipe',
    description: "Snipe target edited message",
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

            const uesnipes = client.uesnipes.get(interaction.channel.id)
            if(!uesnipes) return await interaction.editReply("There's nothing to snipe")

            let num = interaction.options.getInteger("number")
            if(!num) num = 1
            const uesnipe = +num - 1 || 0
            const target = uesnipes[uesnipe]
    
            if(!target) return await interaction.editReply("There's nothing to snipe")
    
            const { oldmsg, newmsg, time, img } = target

            if(oldmsg.author.id !== user.id) return await interaction.editReply("There's nothing to snipe")
    
            const embed = new MessageEmbed()
            .setAuthor(oldmsg.author.tag, oldmsg.author.displayAvatarURL())
            .addField('Before', `${oldmsg.content}` || '[no text]')
            .addField('After', `${newmsg.content}` || '[no text]')
            .setImage(img)
            .setFooter(`${moment(time).fromNow()} | ${uesnipe + 1}/${uesnipes.length}`)
            .setColor('RANDOM')

            await interaction.followUp({ embeds: [embed] })
        } catch (error) {
            console.log(error)
        }
    }
}