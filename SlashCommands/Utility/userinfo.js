const { Client, CommandInteraction, MessageEmbed } = require('discord.js')
const { emojis } = require('../../config.json')
const moment = require('moment')

module.exports = {
    name: 'userinfo',
    description: "Display member's information",
    type: 'CHAT_INPUT',
    options: [
        {
            name: 'user',
            description: 'Required',
            type: 6,
            required: true
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

            let role = member.roles.cache.filter((roles) => roles.id !== interaction.guild.id).map((role) => role.toString())
            if(role.length === 0) role = "No roles to display"
            if(role.length > 20) role = "Too many roles to display"

            const embed = new MessageEmbed()
            .setAuthor(user.tag, user.displayAvatarURL())
            .setDescription(`<@${user.id}>`)
            .addField('Joined Server', `${moment(member.joinedAt).format("LL")}`, true)
            .addField('Created Account', `${moment(member.user.createdAt).format("LL")}`, true)
            .addField('Roles', `${role}`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setColor(member.displayHexColor)
            .setFooter(`ID: ${user.id}`)

            if(member.presence){
                const devices = member.presence?.clientStatus || {}
                const description = () => {
                    const entries = Object.entries(devices)
                    .map(
                        (value) => 
                           `${value[0][0].toUpperCase()}${value[0].slice(1)}`
                    )
                    .join(',');
                    return `**Device:** ${entries}`
                }
    
                let status
                if(member.presence.status === 'online') status = emojis.online
                if(member.presence.status === 'idle') status = emojis.idle
                if(member.presence.status === 'dnd') status = emojis.dnd
                if(member.presence.status === 'online' && description() === `**Device:** Mobile`) status = emojis.mobile
    
                embed.addField('Status', `${description()} ${status}`)
    
                if(member.presence.activities.length === 0){
                    embed.addField('Activity', 'None')
                } else {
                    const activity = member.presence.activities[0]
    
                    let type
                    if(activity.type === 'PLAYING') type = 'Playing'
                    if(activity.type === 'LISTENING') type = 'Listening to'
                    if(activity.type === 'WATCHING') type = 'Watching'
                    if(activity.type === 'STREAMING') type = 'Streaming'
                    if(activity.type === 'COMPETING') type = 'Competing'
                    if(activity.name === 'Custom Status'){
                        if(activity.emoji){
                            embed.addField('Activity', `${activity.emoji.name} ${activity.state || null}`)
                        } else {
                            embed.addField('Activity', `${activity.state}`)
                        }
                    } else {
                        embed.addField('Activity', `${type} ${activity.name} ${emojis.rpc}`)
                    }
                }
            } else {
                embed.addField('Status', 'Offline')
            }

            await interaction.followUp({ embeds: [embed] })
        } catch (error) {
            console.log(error)
        }
    }
}