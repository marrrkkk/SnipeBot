const { Client, Message, MessageEmbed, Permissions } = require('discord.js')
const { emojis } = require('../../config.json')
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
        let prefix = db.get(`prefix_${message.guild.id}`)
        if(prefix === null) prefix = 's!'
        const botPermissionsIn = message.guild.me.permissionsIn(message.channel);
        if(!botPermissionsIn.has([
            Permissions.FLAGS.EMBED_LINKS
        ])) return message.channel.send(`${emojis.cross} Missing Permission: \`EMBED_LINKS\``)

        if(!message.member.permissions.has('MANAGE_GUILD')) return

        const embed = new MessageEmbed()
        .setTitle('Wrong Usage!')
        .setDescription(`${prefix}config prefix \`<newprefix>\`\n${prefix}config log enable\n${prefix}config log disable`)
        .setColor('RED')

        if(!args[0]) return message.channel.send({ embeds: [embed] })
        if(args[0] === 'prefix'){
            let prefix = args[1]

            const err = new MessageEmbed()
            .setDescription(`${emojis.cross} Please provide a new prefix.`)
            .setColor('RED')

            const err2 = new MessageEmbed()
            .setDescription(`${emojis.cross} Max character for prefix is **5**.`)
            .setColor('RED')

            const success = new MessageEmbed()
            .setDescription(`${emojis.check} Prefix has been set to **${prefix}**`)
            .setColor('GREEN')

            if(!args[1]) return message.reply({ embeds: [err] })
            if(prefix.length > 5) return message.reply({ embeds: [err2] })
    
            await db.set(`prefix_${message.guild.id}`, prefix)
            await message.channel.send({ embeds: [success] })
        } else if(args[0] === 'log'){
            const myChannel = '902626836461264896'
            if(!args[1]) return message.channel.send(`Usage: \`${prefix}config log enable/disable\``)
            if(args[1] === 'enable'){
                const channel = message.channel

                const success = new MessageEmbed()
                .setDescription(`${emojis.check} Set message log to ${channel}`)
                .setColor('GREEN')

                const err = new MessageEmbed()
                .setDescription(`${emojis.cross} Message log is already set to ${channel}`)
                .setColor('RED')
    
                let log = db.get(`log_${message.guild.id}`)
                if(!log){
                    await db.set(`log_${message.guild.id}`, channel.id)
                    await message.channel.send({ embeds: [success] })
        
                    if (myChannel.type === 'GUILD_NEWS') {
                        myChannel.addFollower(channel.id, 'Status')
                          .then(() => console.log(`[+] Added follower from ${channel.guild}`))
                          .catch(console.error);
                      }
                } else {
                    message.channel.send({ embeds: [err] })
                }
            }
    
            if(args[1] === 'disable'){

                const err = new MessageEmbed()
                .setDescription(`${emojis.cross} Message log is not yet enabled`)
                .setColor('RED')

                const success = new MessageEmbed()
                .setDescription(`${emojis.check} Disabled Message logging`)
                .setColor('GREY')

                let log = db.get(`log_${message.guild.id}`)
                if(!log){
                    message.channel.send({ embeds: [err] })
                } else {
                    await db.delete(`log_${message.guild.id}`)
                    await message.channel.send({ embeds: [success] })
                }
            }
        }
    }
}