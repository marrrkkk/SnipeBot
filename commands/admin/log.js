const { Client, Message } = require('discord.js')
const db = require('quick.db')

module.exports = {
    name: 'setlog',
    
    /**
     * @param {Client} client
     * @param {Message} message
     * @param {String[]} args
     */

    run: async(client, message, args) => {
        const myChannel = client.channels.cache.get('893704504803987516')
        const option = args[0]

        if(args[0] === 'enable'){
            const channel = message.channel

            let log = db.get(`log_${message.guild.id}`)
            if(!log){
                await db.set(`log_${message.guild.id}`, channel.id)
                await message.channel.send(`<:check2:893700435502837801> Set message log to ${channel}`)
    
                if (myChannel.type === 'GUILD_NEWS') {
                    myChannel.addFollower(channel.id, 'Status')
                      .then(() => console.log('[+] Added follower'))
                      .catch(console.error);
                  }
            } else {
                message.channel.send(`Message log is already set to ${channel}`)
            }
        }

        if(args[0] === 'disable'){
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