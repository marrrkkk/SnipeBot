const { Client, Message, Permissions } = require('discord.js')
const { ownerID } = require('../../config.json')

module.exports = {
    name: 'getinvite',
    aliases: ['getinv'],

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
    
            let tChannel = guild.channels.cache.find(ch => ch.type == "GUILD_TEXT" && ch.permissionsFor(ch.guild.me).has(Permissions.FLAGS.CREATE_INSTANT_INVITE));
            if(!tChannel) return await message.channel.send('No permission was found')
            let invite = await tChannel.createInvite({ temporary: false, maxAge: 0 }).catch(err => {
                return console.log(err);
            });
            await message.channel.send(invite.url)
        } catch (error) {
            console.log(error)
        }
    }
}