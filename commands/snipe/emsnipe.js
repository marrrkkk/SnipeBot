const { Client, Message, MessageEmbed, Permissions } = require('discord.js')
const moment = require('moment')

module.exports = {
    name: 'embedsnipe',
    aliases: ['ems', 'emsnipe'],

    /**
     * @param {Client} client
     * @param {Message} message
     * @param {String[]} args
     */

    run: async(client, message, args) => {
        const channel = message.channel;
        const botPermissionsIn = message.guild.me.permissionsIn(channel);
        if(!botPermissionsIn.has([
            Permissions.FLAGS.EMBED_LINKS
        ])) return message.channel.send('Missing Permission: `EMBED_LINKS`')

        try {
            const emsnipes = client.emsnipes.get(message.channel.id)
            if(!emsnipes) return await message.channel.send("There's nothing to snipe")
    
            const emsnipe = +args[0] - 1 || 0
            const target = emsnipes[emsnipe]
    
            if(!target) return await message.channel.send(`There's only ${bsnipes.length} messages to snipe`)
    
            const { embed, msg, time } = target
    
            const ems = new MessageEmbed(embed)
    
            await message.channel.send({ content: `Original message from: **${msg.author.username}** - <t:${Math.floor(time / 1000)}:R>`, embeds: [ems] })
        } catch (error) {
            console.log(`Error on embedsnipe.js - ${error}`)
        }
    }
}