const client = require('../index')
const { MessageEmbed, MessageButton, MessageActionRow } = require('discord.js')
const db = require('quick.db')

client.on('guildCreate', async guild => {
    try {
        if(!guild.available) return
        await guild.members.fetch()
        const owner = guild.members.cache.get(guild.ownerId)
        const embed = new MessageEmbed()
        .setTitle('New Guild Added')
        .setThumbnail(guild.iconURL())
        .addField('Name', `${guild.name}`)
        .addField('Owner', `[${owner.user.tag}](https://discord.com/users/${owner})`)
        .addField('STATS', `**Users:** ${guild.members.cache.filter(m => !m.user.bot).size}\n**Bots:** ${guild.members.cache.filter(m => m.user.bot).size}\n**Total Members:** ${guild.memberCount}\n**Total Server:** ${client.guilds.cache.size}`)
        .setColor('GREEN')
        .setFooter(`ID: ${guild.id}`)
    
        await client.channels.cache.get('893716885617664062').send({ embeds: [embed] })
    } catch (error) {
        console.log(`Error on guildCreate.js - ${error}`)
    }
})

client.on('guildCreate', async guild => {
    try {
        const limit = client.guilds.cache.size
        const owner = guild.ownerId
        let prefix = db.fetch(`prefix_${guild.id}`)
        if(prefix === null) prefix = 's!'
        let channelTosend
        await guild.channels.cache.forEach(channel => {
            if(
                channel.type === 'GUILD_TEXT' &&
                !channelTosend &&
                channel.permissionsFor(guild.me).has("SEND_MESSAGES")
            ) channelTosend = channel
        })

        if(limit > 95){
            const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                .setLabel('Add Snipe 6')
                .setURL('https://discord.com/oauth2/authorize?client_id=910905182194368522&scope=applications.commands+bot&permissions=8')
                .setStyle('LINK'),
                
                new MessageButton()
                .setLabel('Support Server')
                .setURL('https://discord.gg/WEZkASkcH8')
                .setStyle('LINK')
            )
            const embed = new MessageEmbed()
            .setAuthor(client.user.tag, client.user.displayAvatarURL())
            .setDescription(`Unfortunately, **Snipe** has reach it's limit of 100 servers, So I had to leave **${guild.name}**\n\nYou can invite [Snipe 6](https://discord.com/oauth2/authorize?client_id=910905182194368522&scope=applications.commands+bot&permissions=8), Another version of **Snipe** with the same commands`)
            .setColor('#2f3136')

            await client.users.cache.get(owner).send({ embeds: [embed], components: [row] }).catch(e => console.log(e))
            await channelTosend.send({ embeds: [embed], components: [row] }).catch(e => console.log(e))
            await guild.leave()
        } else {
            const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                .setLabel('Invite')
                .setURL('https://discord.com/oauth2/authorize?client_id=884249240090607637&scope=applications.commands+bot&permissions=8')
                .setStyle('LINK')
            )
            .addComponents(
                new MessageButton()
                .setLabel('Support')
                .setURL('https://discord.gg/WEZkASkcH8')
                .setStyle('LINK')
            )
            const embed = new MessageEmbed()
            .setTitle(`${client.user.username}`)
            .setDescription(`Thank you for inviting me!\nMy prefix is \`${prefix}\`\nType \`${prefix}help\` to get started`)
            .setColor('#2f3136')
    
            await channelTosend.send({ embeds: [embed], components: [row] })
        }
    } catch (error) {
        console.log(`Error on guildCreate.js - ${error}`)
    }
})