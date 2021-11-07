const { Client, CommandInteraction, MessageEmbed, MessageActionRow, MessageButton, MessageAttachment } = require('discord.js')
const moment = require('moment')

module.exports = {
    name: 'maxsnipe',
    description: "Snipe all messages in current channel",

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */

    run: async(client, interaction) => {
        try {
            await interaction.deferReply({ ephemeral: false }).catch(() => {});
            const member = interaction.guild.members.cache.get(interaction.user.id)
            if(!member.permissions.has('ADMINISTRATOR')) return interaction.editReply("<:cross:893700435616100402> You don't have permission to use this command")
            if(client.cooldown.has(interaction.user.id)) return interaction.editReply(`<:cross:893700435616100402> **${interaction.user.username}** you are on cooldown, Please wait a minute`)
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
            .setDescription(`<:danger:902027656223146015> Are you sure you want to snipe all ${snipes.length} messages?`)
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
    
                                await interaction.channel.send({ embeds: [embed] })
                            } else {
                                const { msg, time, img, url, type } = target
                
                                const embed = new MessageEmbed()
                                .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
                                .setDescription(msg.content || '[file]')
                                .setImage(img)
                                .setFooter(`${moment(time).fromNow()} | ${i + 1}/${snipes.length}`)
                                .setColor('RANDOM')
                        
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
                        row.components[0].setDisabled(true)
                        row.components[1].setDisabled(true)
                        const embed = new MessageEmbed()
                        .setTitle('Max Snipe')
                        .setDescription('Cancelled.')
    
                        await msg.edit({ embeds: [embed], components: [row] })
                    }
    
                } else {
                    await b.reply({ content: 'This button is not for you', ephemeral: true })
                }
            })

            collector.on('end', async () => {
                row.components[0].setDisabled(true)
                row.components[1].setDisabled(true)
    
                const embed = new MessageEmbed()
                .setTitle('Max Snipe')
                .setDescription(`Command Timeout, Please try again`)
                await msg.edit({ embeds: [embed], components: [row] })
            })
        } catch (error) {
            console.log(error)
        }
    }
}