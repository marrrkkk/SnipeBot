const { Client, Message, MessageEmbed, Permissions } = require('discord.js')

module.exports = {
    name: 'stats',
    aliases: ['showsnipe', 'statsnipe', 'ssnipe'],
    
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

        if(!message.guild.me.permissions.has('EMBED_LINKS')) return message.channel.send('Missing Permission: `EMBED_LINKS`')

        let snipes = client.snipes.get(message.channel.id)
        let esnipes = client.esnipes.get(message.channel.id)
        let bsnipes = client.bsnipes.get(message.channel.id)
        let besnipes = client.besnipes.get(message.channel.id)
        let emsnipes = client.emsnipes.get(message.channel.id)
        let rsnipes = client.rsnipes.get(message.channel.id)

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
        .setAuthor(`Stats for ${channel.name}`, message.author.displayAvatarURL())
        .setDescription(`> **Deleted Msg:** ${del}/20\n> **Edited Msg:** ${edit}/20\n> **Bot Deleted Msg:** ${botdel}/20\n> **Bot Edited Msg:** ${botedit}/20\n> **Deleted Embed** ${ems}/20\n> **Reaction Removed:** ${react}/20`)
        .setColor('#2f3136')
        .setFooter('Note: It will reset if the bot goes offline')

        message.channel.send({ embeds: [embed] }).catch(e => console.log(e))
    }
}