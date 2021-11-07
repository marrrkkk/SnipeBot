const { Client, Message, MessageEmbed } = require('discord.js')
const { ownerID } = require('../../config.json')

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
            const guild = client.guilds.cache.get(args[0]) || client.guilds.cache.find(g => g.name.toLowerCase() === args.join(' '))
            if(!args[0]) return await message.channel.send('<:cross:893700435616100402> Provide a Server ID')
            if(!guild) return await message.channel.send(`<:cross:893700435616100402> Unable to find server "${args[0]}"`)

            const owner = guild.members.cache.get(guild.ownerId)

            const embed = new MessageEmbed()
            .setAuthor(guild.name, guild.iconURL())
            .setThumbnail(guild.iconURL() || 'https://cdn.discordapp.com/embed/avatars/0.png')
            .setDescription(`**Owner**\n${owner.user.tag}\n\n**Verification:** ${guild.verificationLevel}\n**Boost:** ${guild.premiumSubscriptionCount}`)
            .addField('Stats', `\`\`\`ini\nText Channel:   [${guild.channels.cache.filter(c => c.type === 'GUILD_TEXT').size}]\nVoice Channel:  [${guild.channels.cache.filter(c => c.type === 'GUILD_VOICE').size}]\nUsers:          [${guild.members.cache.filter(m => !m.user.bot).size}]\nBots:           [${guild.members.cache.filter(m => m.user.bot).size}]\nTotal Channels: [${guild.channels.cache.size}]\nTotal Members:  [${guild.memberCount}]\n\`\`\``)
            .setFooter(`ID: ${guild.id}`)
            .setColor('#2f3136')

            const emojis = new MessageEmbed()
            .setTitle(`Emojis[${guild.emojis.cache.size}]`)
            .setDescription(`${guild.emojis.cache.map(e => e).join(" ")}`)
            .setColor('#2f3136')

            await message.channel.send({ embeds: [embed, emojis] })
        } catch (error) {
            console.log(error)
        }
    }
}