const { Client, Message } = require('discord.js')
const db = require('quick.db')

module.exports = {
    name: 'config',
    aliases: ['settings'],

    /**
     * @param {Client} client
     * @param {Message} message
     * @param {String[]} args
     */

    run: async(client, message, args) => {
        if(!message.member.permissions.has('MANAGE_GUILD')) return
        if(args[0] === 'prefix'){
            let prefix = args[1]

            if(!args[1]) return message.reply('<:cross:890077548799725619> Provide a new prefix')
            if(prefix.length > 5) return message.reply('<:cross:890077548799725619> Max character for prefix is `5`')
    
            await db.set(`prefix_${message.guild.id}`, prefix)
            await message.channel.send(`<:check:889870069243478127> Prefix has been set to ${prefix}`)
        } else if(args[0] === 'log'){
            const myChannel = '902626836461264896'
            if(args[1] === 'enable'){
                const channel = message.channel
    
                let log = db.get(`log_${message.guild.id}`)
                if(!log){
                    await db.set(`log_${message.guild.id}`, channel.id)
                    await message.channel.send(`<:check2:893700435502837801> Set message log to ${channel}`)
        
                    if (myChannel.type === 'GUILD_NEWS') {
                        myChannel.addFollower(channel.id, 'Status')
                          .then(() => console.log(`[+] Added follower from ${channel.guild}`))
                          .catch(console.error);
                      }
                } else {
                    message.channel.send(`Message log is already set to ${channel}`)
                }
            }
    
            if(args[1] === 'disable'){
                let log = db.get(`log_${message.guild.id}`)
                if(!log){
                    message.channel.send('Message log is not enabled')
                } else {
                    await db.delete(`log_${message.guild.id}`)
                    await message.channel.send(`<:check2:893700435502837801> Disabled message log`)
                }
            }
        }
    }
}