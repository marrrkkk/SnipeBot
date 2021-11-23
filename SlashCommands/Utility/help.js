const { Client, CommandInteraction, MessageActionRow, MessageSelectMenu, MessageEmbed } = require('discord.js')
const db = require('quick.db')
const { color, emojis } = require('../../config.json')

module.exports = {
    name: 'help',
    description: "Get a list of commands",

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */

    run: async(client, interaction) => {
        try {
            await interaction.deferReply({ ephemeral: false }).catch(() => {});
            let prefix = db.get(`prefix_${interaction.guild.id}`)
            if(prefix === null) prefix = 's!'

            const snipe = new MessageEmbed()
            .setAuthor('Snipe Commands', client.user.displayAvatarURL())
            .addField('__snipe__', '```Retrieve recently deleted messages including image and files```')
            .addField('Usage', `${prefix}s\n${prefix}snipe\n${prefix}snipe 3`, true)
            .addField('Aliases', '*s*', true)
            .setColor(color)
    
            const esnipe = new MessageEmbed()
            .setAuthor('Snipe Commands', client.user.displayAvatarURL())
            .addField('__editsnipe__', '```Retrieve recently edited messages```')
            .addField('Usage', `${prefix}es\n${prefix}esnipe\n${prefix}editsnipe 5`, true)
            .addField('Aliases', '*es*, *esnipe*', true)
            .setColor(color)
    
            const usersnipe = new MessageEmbed()
            .setAuthor('Snipe Commands', client.user.displayAvatarURL())
            .addField('__usersnipe__', '```Retrieve recently deleted messages from the mentioned member```')
            .addField('Usage', `${prefix}us \`@user\`\n${prefix}usnipe \`@user\`\n${prefix}usersnipe \`@user\` 4`, true)
            .addField('Aliases', '*us*, *usnipe*', true)
            .setColor(color)
    
            const useresnipe = new MessageEmbed()
            .setAuthor('Snipe Commands', client.user.displayAvatarURL())
            .addField('__usereditsnipe__', '```Retrieve recently edited messages from the mentioned member```')
            .addField('Usage', `${prefix}ues \`@user\`\n${prefix}uesnipe \`@user\`\n${prefix}usereditsnipe \`@user\` 2`, true)
            .addField('Aliases', '*ues*, *uesnipe*', true)
            .setColor(color)
    
            const botsnipe = new MessageEmbed()
            .setAuthor('Snipe Commands', client.user.displayAvatarURL())
            .addField('__botsnipe__', '```Retrieve recently deleted messages by the bots incuding embeds```')
            .addField('Usage', `${prefix}bs\n${prefix}bsnipe\n${prefix}botsnipe 7`, true)
            .addField('Aliases', '*bs*, *bsnipe*', true)
            .setColor(color)
    
            const botesnipe = new MessageEmbed()
            .setAuthor('Snipe Commands', client.user.displayAvatarURL())
            .addField('__boteditsnipe__', '```Retrieve recently edited messages by the bots```')
            .addField('Usage', `${prefix}bes \`@user\`\n${prefix}besnipe \`@user\`\n${prefix}boteditsnipe \`@user\` 3`, true)
            .addField('Aliases', '*ues*, *besnipe*', true)
            .setColor(color)
    
            const psnipe = new MessageEmbed()
            .setAuthor('Snipe Commands', client.user.displayAvatarURL())
            .addField('__pingsnipe__', '```Retrieve recently deleted messages that includes user or role mentions```')
            .addField('Usage', `${prefix}ps\n${prefix}psnipe\n${prefix}pingsnipe 9`, true)
            .addField('Aliases', '*ps*, *psnipe*', true)
            .setColor(color)
    
            const fsnipe = new MessageEmbed()
            .setAuthor('Snipe Commands', client.user.displayAvatarURL())
            .addField('__filesnipe__', '```Retrieve recently deleted messages that includes file or images```')
            .addField('Usage', `${prefix}fs\n${prefix}fsnipe\n${prefix}filesnipe 8`, true)
            .addField('Aliases', '*fs*, *fsnipe*', true)
            .setColor(color)
    
            const ems = new MessageEmbed()
            .setAuthor('Snipe Commands', client.user.displayAvatarURL())
            .addField('__embedsnipe__', '```Retrieve recently deleted embeds```')
            .addField('Usage', `${prefix}ems\n${prefix}emsnipe\n${prefix}embedsnipe 8`, true)
            .addField('Aliases', '*ems*, *emsnipe*', true)
            .setColor(color)
    
            const react = new MessageEmbed()
            .setAuthor('Snipe Commands', client.user.displayAvatarURL())
            .addField('__reactsnipe__', '```Retrieve recently removed reaction from a message```')
            .addField('Usage', `${prefix}rs\n${prefix}rsnipe\n${prefix}reactsnipe 8`, true)
            .addField('Aliases', '*rs*, *rsnipe*', true)
            .setColor(color)
    
            const rms = new MessageEmbed()
            .setAuthor('Snipe Commands', client.user.displayAvatarURL())
            .addField('__removesnipe__', '```Remove a single snipe from the database```')
            .addField('Usage', `${prefix}rms\n${prefix}rmsnipe\n${prefix}removesnipe 8`, true)
            .addField('Aliases', '*rms*, *rmsnipe*', true)
            .setFooter('Require: MANAGE MESSAGES')
            .setColor(color)
    
            const clear = new MessageEmbed()
            .setAuthor('Snipe Commands', client.user.displayAvatarURL())
            .addField('__clearsnipe__', '```Clear all the snipes from the current channel```')
            .addField('Usage', `${prefix}cs\n${prefix}csnipe\n${prefix}clearsnipe`, true)
            .addField('Aliases', '*cs*, *csnipe*', true)
            .setFooter('Require: ADMINISTRATOR')
            .setColor(color)
    
            const max = new MessageEmbed()
            .setAuthor('Snipe Commands', client.user.displayAvatarURL())
            .addField('__maxsnipe__', '```Show all the snipes from the current channel```')
            .addField('Usage', `${prefix}ms\n${prefix}xsnipe\n${prefix}maxsnipe`, true)
            .addField('Aliases', '*ms*, *xsnipe*', true)
            .setFooter('Require: ADMINISTRATOR')
            .setColor(color)
    
            const about = new MessageEmbed()
            .setAuthor('Utility Commands', client.user.displayAvatarURL())
            .addField('__about__', '```Display the information about the bot```')
            .addField('Usage', `${prefix}botinfo\n${prefix}about`, true)
            .addField('Aliases', '*botinfo*', true)
            .setColor(color)
    
            const av = new MessageEmbed()
            .setAuthor('Utility Commands', client.user.displayAvatarURL())
            .addField('__avatar__', "```Display given user's avatar```")
            .addField('Usage', `${prefix}av \`@user\`\n${prefix}av \`[User ID]\`\n${prefix}av \`username\`\n${prefix}avatar \`@user\``, true)
            .addField('Aliases', '*av*', true)
            .setColor(color)
    
            const help = new MessageEmbed()
            .setAuthor('Utility Commands', client.user.displayAvatarURL())
            .addField('__help__', '```Show the help menu or by each command```')
            .addField('Usage', `${prefix}h\n${prefix}help \`<command>\`\n${prefix}help`, true)
            .addField('Aliases', '*h*', true)
            .setColor(color)
    
            const invite = new MessageEmbed()
            .setAuthor('Utility Commands', client.user.displayAvatarURL())
            .addField('__invite__', '```Get an invite for the bot```')
            .addField('Usage', `${prefix}invite`, true)
            .addField('Aliases', '*invite*', true)
            .setColor(color)
    
            const ping = new MessageEmbed()
            .setAuthor('Utility Commands', client.user.displayAvatarURL())
            .addField('__ping__', "```Check for bot's and api latency```")
            .addField('Usage', `${prefix}ping`, true)
            .addField('Aliases', '*ping*', true)
            .setColor(color)
    
            const whois = new MessageEmbed()
            .setAuthor('Utility Commands', client.user.displayAvatarURL())
            .addField('__userinfo__', '```Display the information about the user```')
            .addField('Usage', `${prefix}whois \`@user\`\n${prefix}whois \`[User ID]\`\n${prefix}whois \`username\`\n${prefix}userinfo \`@user\``, true)
            .addField('Aliases', '*whois*', true)
            .setColor(color)
    
            const vote = new MessageEmbed()
            .setAuthor('Utility Commands', client.user.displayAvatarURL())
            .addField('__vote__', '```Vote for Snipe on top.gg```')
            .addField('Usage', `${prefix}vote`, true)
            .addField('Aliases', '*vote*', true)
            .setColor(color)

    
            const mod = new MessageEmbed()
            .setAuthor('Config Commands', client.user.displayAvatarURL())
            .addField('__moderate__', '```Moderate a user (kick or ban)```')
            .addField('Usage', `${prefix}mod \`@user\`\n${prefix}mod \`[User ID]\`\n${prefix}mod \`username\`\n${prefix}moderate \`@user\``, true)
            .addField('Aliases', '*mod*', true)
            .setFooter('Require: KICK/BAN MEMBERS')
            .setColor(color)
    
            const purge = new MessageEmbed()
            .setAuthor('Utility Commands', client.user.displayAvatarURL())
            .addField('__purge__', '```Delete an amount of messages upto 99```')
            .addField('Usage', `${prefix}purge\n${prefix}purge 10`, true)
            .addField('Aliases', '*purge*', true)
            .setFooter('Require: MANAGE MESSAGES')
            .setColor(color)
    
            const setprefix = new MessageEmbed()
            .setAuthor('Config Commands', client.user.displayAvatarURL())
            .addField('__config__', '```Change the bot settings```')
            .addField('Usage', `${prefix}config prefix \`<newprefix>\`\n${prefix}config log \`<#channel>\``, true)
            .addField('Aliases', '*settings*', true)
            .setFooter('Require: ADMINISTRATOR')
            .setColor(color)

            const row = new MessageActionRow()
            .addComponents(
                new MessageSelectMenu()
                .setCustomId('category')
                .setPlaceholder('Category')
                .addOptions([
                    {
                        label: 'Snipe',
                        value: 'snipe',
                        emoji: emojis.snipe
                    },
                    {
                        label: 'Utility',
                        value: 'util',
                        emoji: '🛠'
                    },
                    {
                        label: 'Config',
                        value: 'config',
                        emoji: '⚙'
                    },
                    {
                        label: 'Slash',
                        value: 'slash',
                        emoji: emojis.slash
                    },
                    {
                        label: 'All Commands',
                        value: 'all',
                        emoji: emojis.all
                    }
                ]),
            )
            const row2 = new MessageActionRow()
            .addComponents(
                new MessageSelectMenu()
                .setCustomId('commands')
                .setPlaceholder('Commands...')
                .addOptions([
                    {
                        label: 'snipe',
                        description: 'Retrieve recently deleted messages including image and files',
                        value: 's'
                    },
                    {
                        label: 'editsnipe',
                        description: 'Retrieve recently edited messages',
                        value: 'es'
                    },
                    {
                        label: 'usersnipe',
                        description: 'Retrieve recently deleted messages from the mentioned member',
                        value: 'us'
                    },
                    {
                        label: 'usereditsnipe',
                        description: 'Retrieve recently edited messages from the mentioned member',
                        value: 'ues'
                    },
                    {
                        label: 'botsnipe',
                        description: 'Retrieve recently deleted messages by the bots incuding embeds',
                        value: 'bs'
                    },
                    {
                        label: 'boteditsnipe',
                        description: 'Retrieve recently edited messages by the bots',
                        value: 'bes'
                    },
                    {
                        label: 'pingsnipe',
                        description: 'Retrieve recently deleted messages that includes user or role mentions',
                        value: 'ps'
                    },
                    {
                        label: 'filesnipe',
                        description: 'Retrieve recently deleted messages that includes file or images',
                        value: 'fs'
                    },
                    {
                        label: 'embedsnipe',
                        description: 'Retrieve recently deleted embeds',
                        value: 'ems'
                    },
                    {
                        label: 'reactsnipe',
                        description: 'Retrieve recently removed reaction from a message',
                        value: 'rs'
                    },
                    {
                        label: 'removesnipe',
                        description: 'Remove a single snipe from the database',
                        value: 'rms'
                    },
                    {
                        label: 'clearsnipe',
                        description: 'Clear all the snipes from the current channel',
                        value: 'cs'
                    },
                    {
                        label: 'maxsnipe',
                        description: 'Show all the snipes from the current channel',
                        value: 'ms'
                    }
                ])
            )
    
            const embed = new MessageEmbed()
            .setAuthor('All Commands', client.user.displayAvatarURL())
            .addField('__Snipe Commands__', '*snipe, esnipe, usersnipe, usereditsnipe, botsnipe, boteditsnipe, pingsnipe, filesnipe, embedsnipe, reactsnipe, removesnipe, clearsnipe, maxsnipe*')
            .addField('__Utility Commands__', '*about, avatar, help, invite, ping, purge, vote, whois*')
            .addField('__Config Commands__', '*config log, config prefix, moderation*')
            .setColor(color)
    
            let msg = await interaction.editReply({ embeds: [embed], components: [row, row2] })
            const collector = msg.createMessageComponentCollector({ componentType: 'SELECT_MENU'})
            collector.on('collect', async b => {
                const value = b.values[0]
                if(b.user.id === interaction.user.id){
                    await b.deferUpdate()
                    if(b.customId === 'category'){

                        //Snipe
                        if(value === 'snipe'){
                            row.components[0].setPlaceholder('Snipe')
                            const row5 = new MessageActionRow()
                            .addComponents(
                                new MessageSelectMenu()
                                .setCustomId('commands')
                                .setPlaceholder('Commands...')
                                .addOptions([
                                    {
                                        label: 'snipe',
                                        description: 'Retrieve recently deleted messages including image and files',
                                        value: 's'
                                    },
                                    {
                                        label: 'editsnipe',
                                        description: 'Retrieve recently edited messages',
                                        value: 'es'
                                    },
                                    {
                                        label: 'usersnipe',
                                        description: 'Retrieve recently deleted messages from the mentioned member',
                                        value: 'us'
                                    },
                                    {
                                        label: 'usereditsnipe',
                                        description: 'Retrieve recently edited messages from the mentioned member',
                                        value: 'ues'
                                    },
                                    {
                                        label: 'botsnipe',
                                        description: 'Retrieve recently deleted messages by the bots incuding embeds',
                                        value: 'bs'
                                    },
                                    {
                                        label: 'boteditsnipe',
                                        description: 'Retrieve recently edited messages by the bots',
                                        value: 'bes'
                                    },
                                    {
                                        label: 'pingsnipe',
                                        description: 'Retrieve recently deleted messages that includes user or role mentions',
                                        value: 'ps'
                                    },
                                    {
                                        label: 'filesnipe',
                                        description: 'Retrieve recently deleted messages that includes file or images',
                                        value: 'fs'
                                    },
                                    {
                                        label: 'embedsnipe',
                                        description: 'Retrieve recently deleted embeds',
                                        value: 'ems'
                                    },
                                    {
                                        label: 'reactsnipe',
                                        description: 'Retrieve recently removed reaction from a message',
                                        value: 'rs'
                                    },
                                    {
                                        label: 'removesnipe',
                                        description: 'Remove a single snipe from the database',
                                        value: 'rms'
                                    },
                                    {
                                        label: 'clearsnipe',
                                        description: 'Clear all the snipes from the current channel',
                                        value: 'cs'
                                    },
                                    {
                                        label: 'maxsnipe',
                                        description: 'Show all the snipes from the current channel',
                                        value: 'ms'
                                    }
                                ])
                            )
                    
                            const embed = new MessageEmbed()
                            .setAuthor('Help Menu', client.user.displayAvatarURL())
                            .addField('__Snipe Commands__', '*snipe, esnipe, usersnipe, usereditsnipe, botsnipe, boteditsnipe, pingsnipe, filesnipe, embedsnipe, reactsnipe, removesnipe, clearsnipe, maxsnipe*')
                            .setColor(color)
                    
                            let msg4 = await msg.edit({ embeds: [embed], components: [row, row5] })
                            const collector = msg4.createMessageComponentCollector({ componentType: 'SELECT_MENU'})

                            collector.on('collect', async e => {
                                const value = e.values[0]
                                if(e.user.id === interaction.user.id){
                                    if(value === 's'){
                                        msg4.edit({ embeds: [snipe] })
                                    } else if(value === 'es') {
                                        msg4.edit({ embeds: [esnipe] })
                                    } else if(value === 'bs') {
                                        msg4.edit({ embeds: [botsnipe] })
                                    } else if(value === 'bes') {
                                        msg4.edit({ embeds: [botesnipe] })
                                    } else if(value === 'ps') {
                                        msg4.edit({ embeds: [psnipe] })
                                    } else if(value === 'fs') {
                                        msg4.edit({ embeds: [fsnipe] })
                                    } else if(value === 'ems') {
                                        msg4.edit({ embeds: [ems] })
                                    } else if(value === 'rs') {
                                        msg4.edit({ embeds: [react] })
                                    } else if(value === 'rms') {
                                        msg4.edit({ embeds: [rms] })
                                    } else if(value === 'cs') {
                                        msg4.edit({ embeds: [clear] })
                                    } else if(value === 'ms') {
                                        msg4.edit({ embeds: [max] })
                                    } else if(value === 'us'){
                                        msg4.edit({ embeds: [usersnipe]})
                                    } else if(value === 'ues'){
                                        msg4.edit({ embeds: [useresnipe] })
                                    }
                                }
                            })
                        }

                        //Utility
                        if(value === 'util'){
                            row.components[0].setPlaceholder('Utility')
                            const row3 = new MessageActionRow()
                            .addComponents(
                                new MessageSelectMenu()
                                .setCustomId('utility')
                                .setPlaceholder('Commands...')
                                .addOptions([
                                    {
                                        label: 'about',
                                        description: 'Display the information about the bot',
                                        value: 'about'
                                    },
                                    {
                                        label: 'avatar',
                                        description: "Display given user's avatar",
                                        value: 'avatar'
                                    },
                                    {
                                        label: 'help',
                                        description: 'Show the help menu or by each command',
                                        value: 'help'
                                    },
                                    {
                                        label: 'invite',
                                        description: 'Get an invite for the bot',
                                        value: 'invite'
                                    },
                                    {
                                        label: 'ping',
                                        description: "Check for bot's and api latency",
                                        value: 'ping'
                                    },
                                    {
                                        label: 'purge',
                                        description: 'Delete an amount of messages upto 99',
                                        value: 'purge'
                                    },
                                    {
                                        label: 'vote',
                                        description: 'Vote for snipe on top.gg',
                                        value: 'vote'
                                    },
                                    {
                                        label: 'whois',
                                        description: 'Display the information about the user',
                                        value: 'whois'
                                    }
                                ])
                            )
                            const embed = new MessageEmbed()
                            .setAuthor('Help Menu', client.user.displayAvatarURL())
                            .addField('__Utility Commands__', '*about, avatar, help, invite, ping, purge, vote, whois*')
                            .setColor(color)
    
                            let msg2 = await msg.edit({ embeds: [embed], components: [row, row3] })
                            const collector = msg2.createMessageComponentCollector({ componentType: 'SELECT_MENU'})
                            collector.on('collect', async c => {
                                const value = c.values[0]
                                if(c.user.id === interaction.user.id){
                                    if(value === 'about'){
                                        await msg2.edit({ embeds: [about] })
                                    } else if(value === 'avatar'){
                                        await msg2.edit({ embeds: [av] })
                                    } else if(value === 'help'){
                                        await msg2.edit({ embeds: [help] })
                                    } else if(value === 'invite'){
                                        await msg2.edit({ embeds: [invite] })
                                    } else if(value === 'ping'){
                                        await msg2.edit({ embeds: [ping] })
                                    } else if(value === 'purge'){
                                        await msg2.edit({ embeds: [purge] })
                                    } else if(value === 'vote'){
                                        await msg2.edit({ embeds: [vote] })
                                    } else if(value === 'whois'){
                                        await msg2.edit({ embeds: [whois] })
                                    }
                                }
                            })
                        } 

                        //config
                        if(value === 'config'){
                            row.components[0].setPlaceholder('Config')
                            let logs
                            const channel = db.get(`log_${interaction.guild.id}`)
                            if(channel === null){
                                logs = `Not Set`
                            } else {
                                logs = `<#${channel}>`
                            }
                            const row4 = new MessageActionRow()
                            .addComponents(
                                new MessageSelectMenu()
                                .setCustomId('configs')
                                .setPlaceholder('Commands...')
                                .addOptions([
                                    {
                                        label: 'config',
                                        description: 'Change the bot settings',
                                        value: 'prefix'
                                    },
                                    {
                                        label: 'moderation',
                                        description: 'Moderate a user (kick or ban)',
                                        value: 'mod'
                                    }
                                ])
                            )
                            const embed = new MessageEmbed()
                            .setAuthor('Help Menu', client.user.displayAvatarURL())
                            .setDescription(`**Log:** ${logs} **|** **Prefix:** ${prefix}`)
                            .addField('__Config Commands__', '*config log, config prefix, moderation*')
                            .setColor(color)

                            let msg3 = await msg.edit({ embeds: [embed], components: [row, row4] })
                            const collector = msg3.createMessageComponentCollector({ componentType: 'SELECT_MENU'})
                            collector.on('collect', async d => {
                                const value = d.values[0]
                                if(d.user.id === interaction.user.id){
                                    if(value === 'prefix'){
                                        await msg3.edit({ embeds: [setprefix] })
                                    } else if(value === 'mod'){
                                        await msg3.edit({ embeds: [mod] })
                                    }
                                }
                            })
                        }

                        //slash
                        if(value === 'slash'){
                        row.components[0].setPlaceholder('Slash')
                        const embed = new MessageEmbed()
                        .setAuthor('Help Menu', client.user.displayAvatarURL())
                        .addField('__Slash Commands__', '*snipe delete, snipe edit, snipe user-delete, snipe user-edit, snipe ping, snipe file, snipe react, snipe embed, stats, about, avatar, help, invite, whois*')
                        .setColor(color)

                        await msg.edit({ embeds: [embed], components: [row] })
                        }

                        if(value === 'all'){
                            row.components[0].setPlaceholder('All Commands')
                            const embed = new MessageEmbed()
                            .setAuthor('All Commands', client.user.displayAvatarURL())
                            .addField('__Snipe Commands__', '*snipe, esnipe, usersnipe, usereditsnipe, botsnipe, boteditsnipe, pingsnipe, filesnipe, embedsnipe, reactsnipe, removesnipe, clearsnipe, maxsnipe*')
                            .addField('__Utility Commands__', '*about, avatar, help, invite, ping, purge, vote, whois*')
                            .addField('__Config Commands__', '*config log, config prefix, moderation*')
                            .setColor(color)
                    
                            await msg.edit({ embeds: [embed], components: [row] })
                        }
                    }

                    if(b.customId === 'commands'){
                        if(value === 's'){
                            msg.edit({ embeds: [snipe] })
                        } else if(value === 'es') {
                            msg.edit({ embeds: [esnipe] })
                        } else if(value === 'bs') {
                            msg.edit({ embeds: [botsnipe] })
                        } else if(value === 'bes') {
                            msg.edit({ embeds: [botesnipe] })
                        } else if(value === 'ps') {
                            msg.edit({ embeds: [psnipe] })
                        } else if(value === 'fs') {
                            msg.edit({ embeds: [fsnipe] })
                        } else if(value === 'ems') {
                            msg.edit({ embeds: [ems] })
                        } else if(value === 'rs') {
                            msg.edit({ embeds: [react] })
                        } else if(value === 'rms') {
                            msg.edit({ embeds: [rms] })
                        } else if(value === 'cs') {
                            msg.edit({ embeds: [clear] })
                        } else if(value === 'ms') {
                            msg.edit({ embeds: [max] })
                        } else if(value === 'us'){
                            msg.edit({ embeds: [usersnipe]})
                        } else if(value === 'ues'){
                            msg.edit({ embeds: [useresnipe] })
                        }
                    }
                }
            })
        } catch (error) {
            console.log(error)
        }
    }
}