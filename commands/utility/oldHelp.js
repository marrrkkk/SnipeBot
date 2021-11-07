const { Client, Message, MessageActionRow, MessageButton, MessageEmbed, Permissions } = require('discord.js')
const db = require('quick.db')

module.exports = {
    name: 'OldHelp',

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

        let prefix = db.get(`prefix_${message.guild.id}`)
        if(prefix === null) prefix = 's!'
        const row = new MessageActionRow()
        .addComponents(
            new MessageButton()
            .setCustomId('snipe')
            .setLabel('Snipe')
            .setStyle('SECONDARY')
            .setDisabled(true)
        )
        .addComponents(
            new MessageButton()
            .setCustomId('util')
            .setLabel('Utility')
            .setStyle('SECONDARY')
        )
        .addComponents(
            new MessageButton()
            .setCustomId('mod')
            .setLabel('Mod')
            .setStyle('SECONDARY')
        )
        .addComponents(
            new MessageButton()
            .setCustomId('new')
            .setLabel("What's new")
            .setEmoji('🎉')
            .setStyle('PRIMARY')
        )

        const embed = new MessageEmbed()
        .setAuthor('Help - Snipe', message.author.displayAvatarURL())
        .setDescription(`**Prefix - **${prefix}`)
        .addField('snipe [num]', 'Snipe the most recently deleted message', true)
        .addField('esnipe [num]', 'Snipe the most recently edited message', true)
        .addField('usnipe <user> [num]', "Snipe user's recently deleted message", true)
        .addField('uesnipe <user> [num]', "Snipe user's recently edited message", true)
        .addField('bsnipe [num]', "Snipe bot's recently deleted message", true)
        .addField('besnipe [num]', "Snipe bot's recently edited message", true)
        .addField('psnipe [num]', "Snipe recently deleted message that ping you", true)
        .addField('fsnipe [num]', 'Snipe recently deleted files', true)
        .addField('rsnipe [num]', 'Snipe the most recently removed reactions', true)
        .addField('emsnipe [num]', 'Snipe recently deleted embeds', true)
        .addField('rmsnipe [num]', 'Remove a single snipe **Require Manage Messages**', true)
        .addField('stats', 'Display stats for deleted and edited messages for the current channel', true)
        .addField('csnipe', "Clear all snipe from the current channel **Require ADMINISTRATOR**", true)
        .addField('maxsnipe', 'Snipe all messages in current channel **Require ADMINISTRATOR**', true)
        .setColor('BLURPLE')

        try {
            let msg = await message.channel.send({ embeds: [embed], components: [row] })
            const collector = msg.createMessageComponentCollector({ componentType: 'BUTTON'})

            collector.on('collect', async b => {
                if(b.user.id !== message.author.id) return

                if(b.customId === 'util'){
                    b.deferUpdate()
                    row.components[0].setDisabled(false)
                    row.components[1].setDisabled(true)
                    row.components[2].setDisabled(false)

                    const util = new MessageEmbed()
                    .setAuthor('Help - Utility', message.author.displayAvatarURL())
                    .setDescription(`\`about\` - Display bot's information\n\`alias\` - Display all commands aliases\n\`avatar\` - Dislay user's avatar\n\`invite\` - Invite Snipe to your server\n\`ping\` - Display bot's latency\n\`purge\` - Delete an amount of messages **Require Manage Message**\n\`vote\` - Vote for Snipe on top.gg\n\`whois\` - Display user's information`)
                    .setColor('BLURPLE')

                    await msg.edit({ embeds: [util], components: [row] })
                }
                if(b.customId === 'mod'){
                    b.deferUpdate()
                    row.components[0].setDisabled(false)
                    row.components[1].setDisabled(false)
                    row.components[2].setDisabled(true)

                    let log
                    const channel = db.get(`log_${message.guild.id}`)
                    if(channel === null){
                        log = `<:cross2:893700435632865281> Message log is disabled`
                    } else {
                        log = `<:check2:893700435502837801> Message log set to <#${channel}>`
                    }

                    const mod = new MessageEmbed()
                    .setAuthor('Help - Mod', message.author.displayAvatarURL())
                    .setDescription(`**Log** - ${log}\n**Prefix** - ${prefix}`)
                    .addField('Commands', `\`setprefix\` - Change bot prefix\n\`mod\` - Moderate a user **Usage:** ${prefix}mod [@user/userID]\n\`setlog[enable/disable]\` - Enable or Disable message logging`)
                    .setColor('BLURPLE')

                    await msg.edit({ embeds: [mod], components: [row] })
                    
                }
                if(b.customId === 'snipe'){
                    b.deferUpdate()
                    row.components[0].setDisabled(true)
                    row.components[1].setDisabled(false)
                    row.components[2].setDisabled(false)

                    const embed = new MessageEmbed()
                    .setAuthor('Help - Snipe', message.author.displayAvatarURL())
                    .setDescription(`**Prefix - **${prefix}`)
                    .addField('snipe [num]', 'Snipe the most recently deleted message', true)
                    .addField('esnipe [num]', 'Snipe the most recently edited message', true)
                    .addField('usnipe <user> [num]', "Snipe user's recently deleted message", true)
                    .addField('uesnipe <user> [num]', "Snipe user's recently edited message", true)
                    .addField('bsnipe [num]', "Snipe bot's recently deleted message", true)
                    .addField('besnipe [num]', "Snipe bot's recently edited message", true)
                    .addField('psnipe [num]', "Snipe recently deleted message that ping you", true)
                    .addField('fsnipe [num]', 'Snipe recently deleted files', true)
                    .addField('rsnipe [num]', 'Snipe the most recently removed reactions', true)
                    .addField('emsnipe [num]', 'Snipe recently deleted embeds', true)
                    .addField('rmsnipe [num]', 'Remove a single snipe **Require Manage Messages**', true)
                    .addField('stats', 'Display stats for deleted and edited messages for the current channel', true)
                    .addField('csnipe', "Clear all snipe from the current channel **Require ADMINISTRATOR**", true)
                    .addField('maxsnipe', 'Snipe all messages in current channel **Require ADMINISTRATOR**', true)
                    .setColor('BLURPLE')

                    await msg.edit({ embeds: [embed], components: [row] })
                }

                if(b.customId === 'new'){
                    const embed = new MessageEmbed()
                    .setTitle('Changelogs')
                    .setDescription("```\n- Added 'removesnipe' command see help for more info\n- Added 'embedsnipe' command, you can now snipe a deleted embed\n- Fixed some bugs`")

                    await b.reply({ embeds: [embed], ephemeral: true })
                }
            })
        } catch (error) {
            console.log(error)
        }
    }
}