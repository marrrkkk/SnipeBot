const client = require('../index')
const { MessageEmbed, MessageAttachment } = require('discord.js')
const db = require('quick.db')

client.on('messageDelete', async message => {
    try {
        if(message.author.bot) return
        let snipes = client.snipes.get(message.channel.id) || []
        if(snipes.length > 19) snipes = snipes.slice(0, 19)
    
        snipes.unshift({
            msg: message,
            img: message.attachments.first()?.proxyURL || null,
            url: message.attachments.first()?.url || null,
            type: message.attachments.first()?.contentType || null,
            time: Date.now()
        })
    
        client.snipes.set(message.channel.id, snipes)
    } catch (error) {
        console.log(error)
    }
})

client.on('messageDelete', async message => {
    try {
        if(message.author.id === client.user.id) return
        if(!message.author.bot) return

        let bsnipes = client.bsnipes.get(message.channel.id) || []
        if(bsnipes.length > 19) bsnipes = bsnipes.slice(0, 19)
    
        bsnipes.unshift({
            msg: message,
            img: message.attachments.first()?.proxyURL || null,
            embeds: message.embeds[0] || null,
            time: Date.now()
        })
    
        client.bsnipes.set(message.channel.id, bsnipes)
    } catch (error) {
        console.log(error)
    }
})

client.on('messageDelete', async message => {
    try {
        if(message.author.bot) return
        if(message.mentions.users.first()){
            let psnipes = client.psnipes.get(message.channel.id) || []
            if(psnipes.length > 19) psnipes = psnipes.slice(0, 19)
        
            psnipes.unshift({
                msg: message,
                ping: message.mentions.users.first(),
                img: message.attachments.first()?.proxyURL || null,
                time: Date.now()
            })
        
            client.psnipes.set(message.channel.id, psnipes)
        }
    } catch (error) {
        console.log(error)
    }
})

client.on('messageDelete', async message => {
    try {
        if(message.author.bot) return
        let usnipes = client.usnipes.get(message.channel.id) || []
        if(usnipes.length > 19) usnipes = usnipes.slice(0, 19)
    
        usnipes.unshift({
            msg: message,
            img: message.attachments.first()?.proxyURL || null,
            time: Date.now()
        })
    
        client.usnipes.set(message.channel.id, usnipes)
    } catch (error) {
        console.log(error)
    }
})

client.on('messageDelete', async message => {
    try {
        if(message.author.bot) return
        if(!message.attachments.first()) return
        let fsnipes = client.fsnipes.get(message.channel.id) || []
        if(fsnipes.length > 19) fsnipes = fsnipes.slice(0, 19)

        fsnipes.unshift({
            msg: message,
            attachment: message.attachments.first()?.url || null,
            type: message.attachments.first()?.contentType || 'Unknown',
            time: Date.now()
        })

        client.fsnipes.set(message.channel.id, fsnipes)
    } catch (error) {
        console.log(error)
    }
})

client.on('messageDelete', async message => {
    try {
        if(message.author.id === client.user.id) return
        if(!message.embeds[0]) return
        let emsnipes = client.emsnipes.get(message.channel.id) || []
        if(emsnipes.length > 19) emsnipes = emsnipes.slice(0, 19)
    
        emsnipes.unshift({
            msg: message,
            embed: message.embeds[0],
            time: Date.now()
        })
        
        client.emsnipes.set(message.channel.id, emsnipes)
    } catch (error) {
        console.log(error)
    }
})

client.on('messageDelete', async message => {
    try {
        if(message.author.bot) return
        if(message.attachments.first()) return
        const channel = db.get(`log_${message.guild.id}`)
        if(channel === null) return

        const embed = new MessageEmbed()
        .setAuthor(message.author.tag, message.author.displayAvatarURL())
        .setTitle(`<:delete:893700435335065631> Message Deleted`)
        .setDescription(`**Author:** ${message.author}\n\n**Channel:** ${message.channel}`)
        .addField('Content', `${message.content || '[no text]'}`)
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setFooter(`User ID: ${message.author.id}`)
        .setTimestamp()
        .setColor("RED")

        await client.channels.cache.get(channel).send({ embeds: [embed] })
    } catch (error) {
        console.log(error)
    }
})

client.on('messageDelete', async message => {
    try {
        if(message.author.bot) return
        if(!message.attachments.first()) return
        const channel = db.get(`log_${message.guild.id}`)
        if(channel === null) return

        const embed = new MessageEmbed()
        .setAuthor(message.author.tag, message.author.displayAvatarURL())
        .setTitle(`<:delete:893700435335065631> Message Deleted`)
        .setDescription(`**Author:** ${message.author}\n\n**Channel:** ${message.channel}`)
        .addField('Content', `${message.content || '[file] <:fileupload:902027655862427668>'}`)
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setFooter(`User ID: ${message.author.id}`)
        .setTimestamp()
        .setColor("RED")

        const file = new MessageAttachment(message.attachments.first()?.url)

        await client.channels.cache.get(channel).send({ embeds: [embed], files: [file] })
    } catch (error) {
        console.log(error)
    }
})