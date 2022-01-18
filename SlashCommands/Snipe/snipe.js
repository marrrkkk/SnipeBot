const { Client, CommandInteraction, MessageEmbed, MessageAttachment, MessageActionRow, MessageButton } = require('discord.js')
const moment = require('moment')
const { emojis } = require('../../config.json')

module.exports = {
    name: 'snipe',
    description: "Snipe recently deleted/edited messages",
    type: 'CHAT_INPUT',
    options: [
        {
            name: 'delete',
            description: 'Snipe recently deleted messages',
            type: 1,
            options: [
                {
                    name: 'position',
                    description: 'Optional',
                    type: 'INTEGER',
                    required: false
                }
            ]
        },
        {
            name: 'edit',
            description: 'Snipe recently edited messages',
            type: 1,
            options: [
                {
                    name: 'position',
                    description: 'Optional',
                    type: 'INTEGER',
                    required: false
                }
            ]
        },
        {
            name: 'file',
            description: 'Snipe recently deleted files/images',
            type: 1,
            options: [
                {
                    name: 'position',
                    description: 'Optional',
                    type: 'INTEGER',
                    required: false
                }
            ]
        },
        {
            name: 'ping',
            description: 'Snipe recently deleted mentions',
            type: 1,
            options: [
                {
                    name: 'position',
                    description: 'Optional',
                    type: 'INTEGER',
                    required: false
                }
            ]
        },
        {
            name: 'embed',
            description: 'Snipe recently deleted embeds',
            type: 1,
            options: [
                {
                    name: 'position',
                    description: 'Optional',
                    type: 'INTEGER',
                    required: false
                }
            ]
        },
        {
            name: 'aim',
            description: 'Snipe recently deleted message by specified user',
            type: 1,
            options: [
                {
                    name: 'user',
                    description: 'Target',
                    type: 6,
                    required: true
                },
                {
                    name: 'position',
                    description: 'Optional',
                    type: 'INTEGER',
                    required: false
                }
            ]
        },
        {
            name: 'reaction',
            description: 'Snipe recently removed reactions',
            type: 1,
            options: [
                {
                    name: 'position',
                    description: 'Optional',
                    type: 'INTEGER',
                    required: false
                }
            ]
        },
        {
            name: 'bot',
            description: 'Snipe recently deleted messages by bot',
            type: 1,
            options: [
                {
                    name: 'position',
                    description: 'Optional',
                    type: 'INTEGER',
                    required: false
                }
            ]
        },
        {
            name: 'max',
            description: 'Snipe all messages in current channel',
            type: 1
        },
        {
            name: 'clear',
            description: 'Remove all snipe in current channel',
            type: 1
        },
        {
            name: 'remove',
            description: 'Delete a single snipe',
            type: 1,
            options: [
                {
                    name: 'position',
                    description: 'Optional',
                    type: 'INTEGER',
                    required: false
                }
            ]
        },
        {
            name: 'remove-file',
            description: 'Delete a single file snipe',
            type: 1,
            options: [
                {
                    name: 'position',
                    description: 'Optional',
                    type: 'INTEGER',
                    required: false
                }
            ]
        },
        {
            name: 'remove-edit',
            description: 'Delete a single edit snipe',
            type: 1,
            options: [
                {
                    name: 'position',
                    description: 'Optional',
                    type: 'INTEGER',
                    required: false
                }
            ]
        }
    ],

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */

    run: async(client, interaction) => {
        try {
            await interaction.deferReply({ ephemeral: false }).catch(() => {});
            const option = interaction.options.getSubcommand()

            const err = new MessageEmbed()
            .setDescription(`${emojis.cross} You don't have permission.`)
            .setColor('RED')

            if(option === 'delete'){


                //Delete
                const snipes = client.snipes.get(interaction.channel.id)
                if(!snipes) return await interaction.editReply("There's nothing to snipe")
                
                let num = interaction.options.getInteger("position")
                if(!num) num = 1
                const snipe = +num - 1 || 0
                const target = snipes[snipe]
        
                if(snipe > snipes.length) return interaction.editReply(`There's only ${snipes.length} message to snipe`)
                if(!target){
                    const embed = new MessageEmbed()
                    .setDescription('This snipe has been removed')
                    .setColor('#2f3136')
        
                    return await interaction.editReply({ embeds: [embed] }).catch(e => console.log(e))
                }
        
                const { msg, time, url, img, type, stkname, stk } = target
        
                if(!url){
                    const embed = new MessageEmbed()
                    .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
                    .setDescription(`${msg.content || `[${stkname}](${stk})`}` || '[no content]')
                    .setImage(img)
                    .setFooter(`${moment(time).fromNow()} | ${snipe + 1}/${snipes.length}`)
                    .setColor('RANDOM')
    
                    if(msg.mentions.repliedUser){
                        embed.addField('Replied to:', `${msg.mentions.repliedUser}`)
                    }
        
                    return interaction.editReply({ embeds: [embed] }).catch(e => console.log(e))
                } else {
                    const embed = new MessageEmbed()
                    .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
                    .setDescription(`${msg.content}\n\n[Attachment](${url})`)
                    .setImage(img)
                    .setFooter(`${moment(time).fromNow()} | ${snipe + 1}/${snipes.length}`)
                    .setColor('RANDOM')
    
                    if(msg.mentions.repliedUser){
                        embed.addField('Replied to:', `${msg.mentions.repliedUser}`)
                    }
        
                    if(type){
                        if(!type.startsWith('image')){
                            const file = new MessageAttachment(url)
                            return interaction.editReply({ embeds: [embed], files: [file] }).catch(e => console.log(e))
                        } else {
                            return interaction.editReply({ embeds: [embed] }).catch(e => console.log(e))
                        }
                    } else if (type === null){
                        const file = new MessageAttachment(url)
                        return interaction.editReply({ embeds: [embed], files: [file] }).catch(e => console.log(e))
                    } else {
                        return interaction.editReply('Unknown Message')
                    }
                }
            } else if (option === 'edit'){

                //Edit
                const esnipes = client.esnipes.get(interaction.channel.id)
                if(!esnipes) return await interaction.editReply("There's nothing to snipe")
    
                let num = interaction.options.getInteger("position")
                if(!num) num = 1
                const esnipe = +num - 1 || 0
                const target = esnipes[esnipe]
        
                if(!target) return await interaction.editReply("There's nothing to snipe")
        
                const { oldmsg, newmsg, time, img } = target

                const row = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                    .setLabel('Context')
                    .setURL(newmsg.url)
                    .setStyle('LINK')
                )
    
                const embed = new MessageEmbed()
                .setAuthor(oldmsg.author.tag, oldmsg.author.displayAvatarURL())
                .addField('Before', `${oldmsg.content}` || '[no text]')
                .addField('After', `${newmsg.content}` || '[no text]')
                .setImage(img)
                .setFooter(`${moment(time).fromNow()} | ${esnipe + 1}/${esnipes.length}`)
                .setColor('RANDOM')
    
                await interaction.editReply({ embeds: [embed], components: [row] })

                //File
            } else if (option === 'file'){
                const fsnipes = client.fsnipes.get(interaction.channel.id)
                if(!fsnipes) return await interaction.editReply("There's nothing to snipe")
    
                let num = interaction.options.getInteger("position")
                if(!num) num = 1
                const fsnipe = +num - 1 || 0
                const target = fsnipes[fsnipe]
        
                if(!target) return await interaction.editReply("There's nothing to snipe")
    
                const { msg, time, attachment, type } = target
        
                const file = new MessageAttachment(attachment)
                const embed = new MessageEmbed()
                .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
                .setDescription(`${msg.content}\n\n**File type:** ${type} <:fileupload:902027655862427668>`)
                .setFooter(`${moment(time).fromNow()} | ${fsnipe + 1}/${fsnipes.length}`)
                .setColor('#2f3136')
    
                await interaction.editReply({ embeds: [embed], files: [file] })

                //Ping
            } else if (option === 'ping'){
                const psnipes = client.psnipes.get(interaction.channel.id)
                if(!psnipes) return await interaction.editReply("There's nothing to snipe")
    
                let num = interaction.options.getInteger("position")
                if(!num) num = 1
                const psnipe = +num - 1 || 0
                const target = psnipes[psnipe]
        
                if(!target) return await interaction.editReply("There's nothing to snipe")
        
                const { msg, time, img } = target
        
                const embed = new MessageEmbed()
                .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
                .setDescription(`${msg.content}` || '[no text]')
                .setImage(img)
                .setFooter(`${moment(time).fromNow()} | ${psnipe + 1}/${psnipes.length}`)
                .setColor('RANDOM')
    
                if(msg.mentions.repliedUser){
                    embed.addField('Replied to:', `${msg.mentions.repliedUser}`)
                }
    
                await interaction.editReply({ embeds: [embed] })

                //Embed
            } else if (option === 'embed'){
                const emsnipes = client.emsnipes.get(interaction.channel.id)
                if(!emsnipes) return await interaction.editReply("There's nothing to snipe")
    
                let num = interaction.options.getInteger("position")
                if(!num) num = 1
                const emsnipe = +num - 1 || 0
                const target = emsnipes[emsnipe]
        
                if(!target) return await interaction.editReply("There's nothing to snipe")
    
                const { msg, time, embed } = target
    
                const snipe = new MessageEmbed(embed)
    
                await interaction.editReply({ content: `Original message from: **${msg.author.username}** - <t:${Math.floor(time / 1000)}:R>`, embeds: [snipe] })

                //aim
            } else if (option === 'aim'){
                const options = interaction.options._hoistedOptions
                const user = (options.find((e) => e.name === 'user') && options.find((e) => e.name === 'user').member.user) || interaction.user
                const member = (options.find((e) => e.name === 'user') && options.find((e) => e.name === 'user').member) || interaction.user
    
                const usnipes = client.usnipes.get(member.id)
                if(!usnipes) return await interaction.editReply(`**${member.displayName}** does not have any deleted messages in my history.`)
    
                let num = interaction.options.getInteger("position")
                if(!num) num = 1
                const usnipe = +num - 1 || 0
                const target = usnipes[usnipe]
        
                if(usnipe > usnipes.length) return await message.channel.send(`There's only ${usnipes.length} message to snipe`)
                if(!target){
                    const embed = new MessageEmbed()
                    .setDescription('This snipe has been removed')
                    .setColor('#2f3136')
        
                    return await interaction.editReply({ embeds: [embed] })
                }

                const { msg, time, img } = target
        
                const embed = new MessageEmbed()
                .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
                .setDescription(msg.content || '[no text]')
                .addField('Channel:', `${msg.channel}`)
                .setImage(img)
                .setFooter(`${moment(time).fromNow()} | ${usnipe + 1}/${usnipes.length}`)
                .setColor('RANDOM')

                if(msg.mentions.repliedUser){
                    embed.addField('Replied to:', `${msg.mentions.repliedUser}`)
                }
    
                await interaction.editReply({ embeds: [embed] })

                //Reaction
            } else if (option === 'reaction'){
                const rsnipes = client.rsnipes.get(interaction.channel.id)
                if(!rsnipes) return await interaction.editReply("There's nothing to snipe")
    
                let num = interaction.options.getInteger("position")
                if(!num) num = 1
                const rsnipe = +num - 1 || 0
                const target = rsnipes[rsnipe]
        
                if(!target) return await interaction.editReply("There's nothing to snipe")
        
                const { author, time, img, msg, link } = target

                const row = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                    .setLabel('Context')
                    .setURL(link)
                    .setStyle('LINK')
                )
    
                const embed = new MessageEmbed()
                .setAuthor(author.tag, author.displayAvatarURL())
                .setDescription(`${msg}`)
                .setImage(img)
                .setFooter(`${moment(time).fromNow()} | ${rsnipe + 1}/${rsnipes.length}`)
                .setColor('RANDOM')
    
                await interaction.editReply({ embeds: [embed], components: [row] })

                //Bot
            } else if (option === 'bot'){
                const bsnipes = client.bsnipes.get(interaction.channel.id)
                if(!bsnipes) return await interaction.editReply("There's nothing to snipe")
        
                let num = interaction.options.getInteger("position")
                if(!num) num = 1
                const bsnipe = +num - 1 || 0
                const target = bsnipes[bsnipe]
        
                if(!target) return await interaction.editReply(`There's only ${bsnipes.length} messages to snipe`)
        
                const { msg, time, img, embeds } = target
        
                if(embeds){
                    const embed = new MessageEmbed(embeds)
                    return await interaction.editReply({ content: `Original message from: **${msg.author.username}** - <t:${Math.floor(time / 1000)}:R>`, embeds: [embed] }).catch(e => console.log(e))
                } else {
                    const embed = new MessageEmbed()
                    .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
                    .setDescription(msg.content || '[embed]')
                    .setImage(img)
                    .setFooter(`${moment(time).fromNow()} | ${bsnipe + 1}/${bsnipes.length}`)
                    .setColor('RANDOM')
            
                    return await interaction.editReply({ embeds: [embed] }).catch(e => console.log(e))
                }
                
                //Max
            } else if (option === 'max'){
                const member = interaction.guild.members.cache.get(interaction.user.id)
                if(!member.permissions.has('ADMINISTRATOR')) return interaction.editReply({ embeds: [err] })
                if(client.cooldown.has(interaction.user.id)) return interaction.editReply(`${emojis.cross} **${interaction.user.username}** you are on cooldown, Please wait a minute`)
                .then(msg => {
                    setTimeout(() => {
                        msg.delete()
                    }, 5000)
                })
                const snipes = client.snipes.get(interaction.channel.id)
                if(!snipes) return interaction.editReply("There's nothing to snipe")
        
                const row = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                    .setCustomId('confirm')
                    .setLabel('Confirm')
                    .setStyle('SUCCESS'),
        
                    new MessageButton()
                    .setCustomId('cancel')
                    .setLabel('Cancel')
                    .setStyle('DANGER')
                )
        
                const embed = new MessageEmbed()
                .setTitle('Max Snipe')
                .setDescription(`${emojis.danger} Are you sure you want to snipe all ${snipes.length} messages?`)
                .setColor('#2f3136')
    
                client.cooldown.set(interaction.user.id) 
                setTimeout(() => {
                    client.cooldown.delete(interaction.user.id)
                }, 60000);
        
                let msg = await interaction.editReply({ embeds: [embed], components: [row] })
                const collector = msg.createMessageComponentCollector({ componentType: 'BUTTON', time: 60000 })
        
                collector.on('collect', async b => {
                    if(b.user.id === interaction.user.id){
                        await b.deferUpdate()
                        if(b.customId === 'confirm'){
                            row.components[0].setDisabled(true)
                            row.components[1].setDisabled(true)
                            for(let i = 0; i < snipes.length; i++){
                                const target = snipes[i]
                                if(!target){
                                    const embed = new MessageEmbed()
                                    .setDescription('This snipe has been removed')
                                    .setColor('#2f3136')
        
                                    await interaction.channel.send({ embeds: [embed] }).catch(e => console.log(e))
                                } else {
                                    const { msg, time, img, url, type } = target
                    
                                    const embed = new MessageEmbed()
                                    .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
                                    .setDescription(msg.content || '[file]')
                                    .setImage(img)
                                    .setFooter(`${moment(time).fromNow()} | ${i + 1}/${snipes.length}`)
                                    .setColor('RANDOM')

                                    if(msg.mentions.repliedUser){
                                        embed.addField('Replied to:', `${msg.mentions.repliedUser}`)
                                    }
                            
                                    if(!url){
                                        interaction.channel.send({ embeds: [embed] }).catch(e => console.log(e))
                                    } else {
                                        if(!type.startsWith('image')){
                                            const file = new MessageAttachment(url)
                                            await interaction.channel.send({ embeds: [embed], files: [file] }).catch(e => console.log(e))
                                        } else {
                                            await interaction.channel.send({ embeds: [embed] }).catch(e => console.log(e))
                                        }
                                    }
                                }
                            }
        
                            await msg.edit({ components: [row] })
                        } else if (b.customId === 'cancel'){
                            client.cooldown.delete(interaction.user.id)
                            await row.components[0].setDisabled(true)
                            await row.components[1].setDisabled(true)
                            const embed = new MessageEmbed()
                            .setTitle('Cancelled')
                            .setDescription(`${emojis.danger} Are you sure you want to snipe all ${snipes.length} messages?`)
                            .setColor('RED')
        
                            await msg.edit({ embeds: [embed], components: [row] }).catch(e => console.log(e))
                        }
        
                    } else {
                        await b.reply({ content: 'This button is not for you', ephemeral: true })
                    }
                })
    
                collector.on('end', async () => {
                    await row.components[0].setDisabled(true)
                    await row.components[1].setDisabled(true)
                    
                    await msg.edit({ components: [row] }).catch(e => console.log(e))
                })

                //Clear
            } else if (option === 'clear'){
                const member = interaction.guild.members.cache.get(interaction.user.id)
                if(!member.permissions.has('ADMINISTRATOR')) return interaction.editReply({ embeds: [err] })
                const channel = interaction.channel
                const row = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                    .setCustomId('confirm')
                    .setLabel('Delete')
                    .setStyle('DANGER')
                )
                .addComponents(
                    new MessageButton()
                    .setCustomId('cancel')
                    .setLabel('Cancel')
                    .setStyle('SECONDARY')
                )
    
                const embed = new MessageEmbed()
                .setAuthor('Clear Snipe',interaction.user.displayAvatarURL())
                .setDescription(`Are you sure you want to delete all snipes in ${channel}`)
    
                let msg = await interaction.editReply({ embeds: [embed], components: [row] })
                const collector = msg.createMessageComponentCollector({ componentType: 'BUTTON'})
    
                collector.on('collect', async b => {
                    await b.deferUpdate()
                    if(b.user.id !== interaction.user.id) return
                    if(b.customId === 'confirm'){
                        row.components[0].setDisabled(true)
                        row.components[1].setDisabled(true)
    
                        const confirm = new MessageEmbed()
                        .setAuthor('Clear Snipe', interaction.user.displayAvatarURL())
                        .setDescription(`All snipes have been deleted in ${channel}`)
                        .setColor('GREEN')
    
                        await client.snipes.delete(interaction.channel.id)
                        await client.esnipes.delete(interaction.channel.id)
                        await client.bsnipes.delete(interaction.channel.id)
                        await client.besnipes.delete(interaction.channel.id)
                        await client.psnipes.delete(interaction.channel.id)
                        await client.ebsnipes.delete(interaction.channel.id)
                        await client.usnipes.delete(interaction.channel.id)
                        await client.rsnipes.delete(interaction.channel.id)
    
                        await msg.edit({ embeds: [confirm], components: [row] }).catch(e => console.log(e))
                    }
    
                    if(b.customId === 'cancel'){
                        row.components[0].setDisabled(true)
                        row.components[1].setDisabled(true)
    
                        const cancel = new MessageEmbed()
                        .setAuthor('Clear Snipe', interaction.user.displayAvatarURL())
                        .setDescription(`Cancelled.`)
                        .setColor('GREY')
    
                        await msg.edit({ embeds: [cancel], components: [row] }).catch(e => console.log(e))
                    }
                })
            } else if(option === 'remove'){
                const member = interaction.guild.members.cache.get(interaction.user.id)
                if(!member.permissions.has('MANAGE_MESSAGES')) return interaction.editReply({ embeds: [err] })
                const snipes = client.snipes.get(interaction.channel.id)
                if(!snipes) return await interaction.editReply("There's nothing to remove")
                let num = interaction.options.getInteger("position")
                if(!num) num = 1
                const snipe = +num - 1 || 0
                snipes[snipe] = null
                await interaction.editReply('Snipe removed.')
            } else if(option === 'remove-file'){
                const member = interaction.guild.members.cache.get(interaction.user.id)
                if(!member.permissions.has('MANAGE_MESSAGES')) return interaction.editReply({ embeds: [err] })
                const fsnipes = client.fsnipes.get(interaction.channel.id)
                if(!fsnipes) return await interaction.editReply("There's nothing to remove")
                let num = interaction.options.getInteger("position")
                if(!num) num = 1
                const fsnipe = +num - 1 || 0
                fsnipes[fsnipe] = null
                await interaction.editReply('Snipe removed.')
            } else if(option === 'remove-edit'){
                const member = interaction.guild.members.cache.get(interaction.user.id)
                if(!member.permissions.has('MANAGE_MESSAGES')) return interaction.editReply({ embeds: [err] })
                if(!esnipes) return await interaction.editReply("There's nothing to remove")
                let num = interaction.options.getInteger("position")
                if(!num) num = 1
                const esnipe = +num - 1 || 0
                esnipes[esnipe] = null
                await interaction.editReply('Snipe removed.')
            }
        } catch (error) {
            console.log(error)
        }
    }
}