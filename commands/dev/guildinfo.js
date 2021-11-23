const { Client, Message, MessageEmbed } = require('discord.js')
const { ownerID, emojis } = require('../../config.json')

module.exports = {
    name: 'guildinfo',
    aliases: ['gi'],

    /**
     * @param {Client} client
     * @param {Message} message
     * @param {String[]} args
     */

    run: async(client, message, args) => {
        if(message.author.id !== ownerID) return
        try {
            let guild = client.guilds.cache.get(args[0]) || client.guilds.cache.find(g => g.name.toLowerCase() === args.join(' '))
            if(!args[0]) guild = message.guild

            const err = new MessageEmbed()
            .setDescription(`${emojis.cross} Unable to find server "**${args[0]}**"`)
            .setColor('RED')

            if(!guild) return await message.channel.send({ embeds: [err] })

            const owner = guild.members.cache.get(guild.ownerId)

            let admin
            if(guild.me.permissions.has('ADMINISTRATOR')){
                admin = 'Yes'
            } else {
                admin = 'No'
            }

            const embed = new MessageEmbed()
            .setAuthor(guild.name, guild.iconURL())
            .setThumbnail(guild.iconURL() || 'https://cdn.discordapp.com/embed/avatars/0.png')
            .setDescription(`**Owner**\n${owner.user.tag}\n\n**Verification:** ${guild.verificationLevel}\n**Boost:** ${guild.premiumSubscriptionCount}\n**Admin:** ${admin}`)
            .addField('Stats', `\`\`\`ini\nText Channel:   [${guild.channels.cache.filter(c => c.type === 'GUILD_TEXT').size}]\nVoice Channel:  [${guild.channels.cache.filter(c => c.type === 'GUILD_VOICE').size}]\nUsers:          [${guild.members.cache.filter(m => !m.user.bot).size}]\nBots:           [${guild.members.cache.filter(m => m.user.bot).size}]\nTotal Channels: [${guild.channels.cache.size}]\nTotal Members:  [${guild.memberCount}]\n\`\`\``)
            .setFooter(`ID: ${guild.id}`)
            .setColor('#2f3136')

            const emoji = new MessageEmbed()
            .setTitle(`Emojis[${guild.emojis.cache.size}]`)
            .setDescription(`${guild.emojis.cache.map(e => e).join(" ")}`)
            .setColor('#2f3136')

            await message.channel.send({ embeds: [embed, emoji] })
        } catch (error) {
            console.log(error)
        }
    }
}