const { Client, Message, MessageActionRow, MessageButton, MessageEmbed, Permissions } = require('discord.js')
const { emojis } = require('../../config.json')
const moment = require('moment')

module.exports = {
    name: 'moderate',
    aliases: ['mod', 'moderation'],
    
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
        
        if(!message.guild.me.permissions.has(['BAN_MEMBERS', 'KICK_MEMBERS'])) return message.channel.send('Missing Permissions: `BAN/KICK_MEMBERS`')
        const row = new MessageActionRow()
        .addComponents(
            new MessageButton()
            .setCustomId('kick')
            .setLabel('Kick')
            .setStyle('SECONDARY')
        )
        .addComponents(
            new MessageButton()
            .setCustomId('ban')
            .setLabel('Ban')
            .setStyle('DANGER')
        )
        let Member = message.mentions.members.first() || message.guild.members.cache.get(args[0]) ||
        message.guild.members.cache.find(m => m.user.username === args.join(' ')) || message.guild.members.cache.find(m => m.user.username.toLowerCase() === args.join(' ')) ||
        message.guild.members.cache.find(m => m.displayName === args.join(' ')) || message.guild.members.cache.find(m => m.displayName.toLowerCase() === args.join(' '))
        if(!args[0]) Member = message.member

        const err = new MessageEmbed()
        .setDescription(`${emojis.cross} Could't find member "**${args.join(' ')}**"`)
        .setColor('RED')
        
        if(!Member) return message.channel.send({ embeds: [err] })

        const embed = new MessageEmbed()
        .setAuthor(Member.user.tag, Member.user.displayAvatarURL())
        .setDescription(`<@${Member.id}>`)
        .addField('Joined Server', `${moment(Member.joinedAt).format("LL")}`, true)
        .addField('Created Account', `${moment(Member.user.createdAt).format("LL")}`, true)
        .setColor('BLURPLE')

        let msg = await message.channel.send({ embeds: [embed], components: [row] }).catch(e => console.log(e))
        const collector = msg.createMessageComponentCollector({ componentType: 'BUTTON', time: 15000 });

        collector.on('collect', async b => {
            b.deferUpdate()
            if(b.user.id !== message.author.id) return

            if(b.customId === 'kick'){
                row.components[0].setDisabled(true)
                row.components[1].setDisabled(true)

                const fail1 = new MessageEmbed()
                .setAuthor(Member.user.tag, Member.user.displayAvatarURL())
                .setDescription('<:cross:890077548799725619> Unable to kick that member')
                .setColor('RED')

                const fail2 = new MessageEmbed()
                .setAuthor(Member.user.tag, Member.user.displayAvatarURL())
                .setDescription('<:cross:890077548799725619> Unable to kick someone higher or the same role as you')
                .setColor('RED')

                const fail3 = new MessageEmbed()
                .setAuthor(Member.user.tag, Member.user.displayAvatarURL())
                .setDescription("<:cross:890077548799725619> You don't have permission to kick members")
                .setColor('RED')

                const fail4 = new MessageEmbed()
                .setAuthor(Member.user.tag, Member.user.displayAvatarURL())
                .setDescription("<:cross:890077548799725619> I don't have permission to kick members")
                .setColor('RED')

                const success = new MessageEmbed()
                .setAuthor(Member.user.tag, Member.user.displayAvatarURL())
                .setDescription(`Kicked **${Member.user.username}**`)
                .setColor('GREEN')

                if(!message.guild.me.permissions.has('KICK_MEMBERS')) return await msg.edit({ embeds: [fail4], components: [row] })
                if(!message.member.permissions.has('KICK_MEMBERS')) return await msg.edit({ embeds: [fail3], components: [row] })
                if(!Member.kickable) return await msg.edit({ embeds: [fail1], components: [row] })
                if(message.member.roles.highest.position <= Member.roles.highest.position) return await msg.edit({ embeds: [fail2], components: [row] })
        
                await Member.send(`You have been kicked from ${message.guild.name}`).catch(e => console.log(e))
                await Member.kick().catch(e => console.log(e)).then(() => msg.edit({ embeds: [success], components: [row] }))
            }

            if(b.customId === 'ban'){
                row.components[0].setDisabled(true)
                row.components[1].setDisabled(true)

                const fail1 = new MessageEmbed()
                .setAuthor(Member.user.tag, Member.user.displayAvatarURL())
                .setDescription('<:cross:890077548799725619> Unable to ban that member')
                .setColor('RED')

                const fail2 = new MessageEmbed()
                .setAuthor(Member.user.tag, Member.user.displayAvatarURL())
                .setDescription('<:cross:890077548799725619> Unable to ban someone higher or the same role as you')
                .setColor('RED')

                const fail3 = new MessageEmbed()
                .setAuthor(Member.user.tag, Member.user.displayAvatarURL())
                .setDescription("<:cross:890077548799725619> You don't have permission to ban members")
                .setColor('RED')

                const fail4 = new MessageEmbed()
                .setAuthor(Member.user.tag, Member.user.displayAvatarURL())
                .setDescription("<:cross:890077548799725619> I don't have permission to ban members")
                .setColor('RED')

                const success = new MessageEmbed()
                .setAuthor(Member.user.tag, Member.user.displayAvatarURL())
                .setDescription(`Banned **${Member.user.username}**`)
                .setColor('GREEN')

                if(!message.guild.me.permissions.has('BAN_MEMBERS')) return await msg.edit({ embeds: [fail4], components: [row] })
                if(!message.member.permissions.has('BAN_MEMBERS')) return await msg.edit({ embeds: [fail3], components: [row] })
                if(!Member.bannable) return await msg.edit({ embeds: [fail1], components: [row] })
                if(message.member.roles.highest.position <= Member.roles.highest.position) return await msg.edit({ embeds: [fail2], components: [row] })
        
                await Member.send(`You have been banned from ${message.guild.name}`).catch(e => console.log(e))
                await Member.ban({ days: 7 }).catch(e => console.log(e)).then(() => msg.edit({ embeds: [success], components: [row] }))
            }
        })

        collector.on('end', async () => {
            row.components[0].setDisabled(true)
            row.components[1].setDisabled(true)

            await msg.edit({ components: [row] })
        })
    }
}