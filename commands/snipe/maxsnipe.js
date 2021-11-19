const { Client, Message, MessageEmbed, Permissions, MessageAttachment, MessageActionRow, MessageButton } = require('discord.js')
const moment = require('moment')

module.exports = {
    name: 'maxsnipe',
    aliases: ['ms', 'xsnipe'],

    /**
     * @param {Client} client
     * @param {Message} message
     * @param {String[]} args
     */

    run: async(client, message, args) => {
        if(!message.member.permissions.has("ADMINISTRATOR")) return message.reply("<:cross:893700435616100402> You don't have permission to use this command")
        if(client.cooldown.has(message.author.id)) return message.channel.send(`<:cross:893700435616100402> **${message.author.username}** you are on cooldown, Please wait a minute`)
        .then(msg => {
            setTimeout(() => {
                msg.delete()
            }, 5000)
        })
        const channel = message.channel;
        const botPermissionsIn = message.guild.me.permissionsIn(channel);
        if(!botPermissionsIn.has([
            Permissions.FLAGS.EMBED_LINKS
        ])) return message.channel.send('Missing Permission: `EMBED_LINKS`')

        const snipes = client.snipes.get(message.channel.id)
        if(!snipes) return message.channel.send("There's nothing to snipe")

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
        .setDescription(`<:danger:902027656223146015> Are you sure you want to snipe all ${snipes.length} messages?`)
        .setColor('#2f3136')

        client.cooldown.set(message.author.id) 
        setTimeout(() => {
            client.cooldown.delete(message.author.id)
        }, 60000);

        try {
            let msg = await message.channel.send({ embeds: [embed], components: [row] })
            const collector = msg.createMessageComponentCollector({ componentType: 'BUTTON', time: 10000})
    
            collector.on('collect', async b => {
                try {
                    if(b.user.id === message.author.id){
                        await b.deferUpdate()
                        if(b.customId === 'confirm'){
                            await row.components[0].setDisabled(true)
                            await row.components[1].setDisabled(true)
                            await msg.edit({ components: [row] })
                            for(let i = 0; i < snipes.length; i++){
                                const target = snipes[i]
                                if(!target){
                                    const embed = new MessageEmbed()
                                    .setDescription('This snipe has been removed')
                                    .setColor('#2f3136')
        
                                    await message.channel.send({ embeds: [embed] })
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
                                        await message.channel.send({ embeds: [embed] }).catch(e => console.log(e))
                                    } else {
                                        if(!type.startsWith('image')){
                                            const file = new MessageAttachment(url)
                                            await message.channel.send({ embeds: [embed], files: [file] }).catch(e => console.log(e))
                                        } else {
                                            await message.channel.send({ embeds: [embed] }).catch(e => console.log(e))
                                        }
                                    }
                                }
                            }
                        } else if (b.customId === 'cancel'){
                            await client.cooldown.delete(message.author.id)
                            await row.components[0].setDisabled(true)
                            await row.components[1].setDisabled(true)
                            const embed = new MessageEmbed()
                            .setTitle('Cancelled')
                            .setDescription(`<:danger:902027656223146015> Are you sure you want to snipe all ${snipes.length} messages?`)
                            .setColor('RED')
        
                            return await msg.edit({ embeds: [embed], components: [row] })
                        }
        
                    } else {
                        return await b.reply({ content: 'This button is not for you', ephemeral: true })
                    }
                } catch (error) {
                    console.log(`Error on maxsnipe.js collector.on() - ${error}`)
                }
            })
    
            collector.on('end', async () => {
                try {
                    await row.components[0].setDisabled(true)
                    await row.components[1].setDisabled(true)
                    
                    await msg.edit({ components: [row] })
                } catch (error) {
                    console.log(`Error on maxsnipe.js collector.on('end') - ${error}`)
                }
            })
        } catch (error) {
            console.log(`Error on maxsnipe.js - ${error}`)
        }
    }
}