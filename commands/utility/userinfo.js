const { Client, Message, MessageEmbed } = require('discord.js')
const { emojis } = require('../../config.json')
const moment = require('moment')

module.exports = {
    name: 'userinfo',
    aliases: ['whois'],

    /**
     * @param {Client} client
     * @param {Message} message
     * @param {String[]} args
     */

    run: async(client, message, args) => {
        let user = message.mentions.users.first() || message.guild.members.cache.get(args[0]) || 
        message.guild.members.cache.find(m => m.user.username === args.join(' ')) || message.guild.members.cache.find(m => m.user.username.toLowerCase() === args.join(' ')) ||
        message.guild.members.cache.find(m => m.displayName === args.join(' ')) || message.guild.members.cache.find(m => m.displayName.toLowerCase() === args.join(' '))
        if(!args[0]) user = message.member
        if(!user) return message.channel.send(`Unable find member "${args.join(' ')}"`)

        const member = message.guild.members.cache.get(user.id)

        let role = member.roles.cache.filter((roles) => roles.id !== message.guild.id).map((role) => role.toString())
        if(role.length === 0) role = "No roles to display"
        if(role.length > 20) role = "Too many roles to display"

        const embed = new MessageEmbed()
        .setAuthor(member.user.tag, member.user.displayAvatarURL())
        .setDescription(`<@${user.id}>`)
        .addField('Joined Server', `${moment(member.joinedAt).format("LL")}`, true)
        .addField('Created Account', `${moment(member.user.createdAt).format("LL")}`, true)
        .addField('Roles', `${role}`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setColor(member.displayHexColor)
        .setFooter(`ID: ${member.id}`)

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

        await message.channel.send({ embeds: [embed] }).catch(e => console.log(e))
    }
}