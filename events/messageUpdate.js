const client = require('../index')
const { MessageEmbed, MessageAttachment } = require('discord.js')
const db = require('quick.db')

client.on('messageUpdate', async (oldMessage, newMessage) => {
    try {
        if(oldMessage.author.bot) return
        let esnipes = client.esnipes.get(oldMessage.channel.id) || []
        if(esnipes.length > 19) esnipes = esnipes.slice(0, 19)
    
        esnipes.unshift({
            oldmsg: oldMessage,
            newmsg: newMessage,
            img: oldMessage.attachments.first()?.proxyURL || null,
            time: Date.now()
        })
    
        client.esnipes.set(oldMessage.channel.id, esnipes)
    } catch (error) {
        console.log(error)
    }
})

client.on('messageUpdate', async (oldMessage, newMessage) => {
    try {
        if(oldMessage.author.id === client.user.id) return
        if(!oldMessage.author.bot) return
        let besnipes = client.besnipes.get(oldMessage.channel.id) || []
        if(besnipes.length > 19) besnipes = besnipes.slice(0, 19)
    
        besnipes.unshift({
            oldmsg: oldMessage,
            newmsg: newMessage,
            img: oldMessage.attachments.first()?.proxyURL || null,
            time: Date.now()
        })
    
        client.besnipes.set(oldMessage.channel.id, besnipes)
    } catch (error) {
        console.log(error)
    }
})

client.on('messageUpdate', async (oldMessage, newMessage) => {
    try {
        if(oldMessage.author.bot) return
        let uesnipes = client.uesnipes.get(oldMessage.channel.id) || []
        if(uesnipes.length > 19) uesnipes = uesnipes.slice(0, 19)
    
        uesnipes.unshift({
            oldmsg: oldMessage,
            newmsg: newMessage,
            img: oldMessage.attachments.first()?.proxyURL || null,
            time: Date.now()
        })
    
        client.uesnipes.set(oldMessage.channel.id, uesnipes)
    } catch (error) {
        console.log(error)
    }
})

client.on('messageUpdate', async (oldMessage, newMessage) => {
    try {
        if(oldMessage.content === newMessage.content) return
        if(oldMessage.author.bot) return
        const channel = db.get(`log_${oldMessage.guild.id}`)
        if(channel === null) return
        const embed = new MessageEmbed()
        .setAuthor(oldMessage.author.tag, oldMessage.author.displayAvatarURL())
        .setTitle(`<:edit:889888701855969281> Message Updated`)
        .setDescription(`**Author:** ${oldMessage.author}\n\n**Channel:** ${oldMessage.channel}`)
        .addField('Before', `${oldMessage.content}` || '[file]')
        .addField('After', `${newMessage.content}` || '[file]')
        .setThumbnail(oldMessage.author.displayAvatarURL({ dynamic: true }))
        .setFooter(`User ID: ${oldMessage.author.id}`)
        .setTimestamp()
        .setColor("YELLOW")
    
        if(oldMessage.attachments.first()){
            const file = new MessageAttachment(oldMessage.attachments.first()?.proxyURL)
            await client.channels.cache.get(channel).send({ embeds: [embed], files: [file] })
        } else {
            await client.channels.cache.get(channel).send({ embeds: [embed] })
        }
    } catch (error) {
        console.log(error)
    }
})