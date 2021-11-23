const { Client, CommandInteraction, MessageEmbed } = require('discord.js')
const { emojis } = require('../../config.json')
const db = require('quick.db')

module.exports = {
    name: 'messagelog',
    description: 'Set messagelogging',
    type: 'CHAT_INPUT',
    options: [
        {
            name: 'enable',
            description: 'Set the logging channel',
            type: 1,
            options: [
                {
                    name: 'channel',
                    description: 'Optional',
                    type: 7,
                    channelTypes: ['GUILD_TEXT']
                }
            ]
        },
        {
            name: 'disable',
            description: 'Disable the logging channel',
            type: 1
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

            if(option === 'enable'){
                let channel = interaction.options.getChannel('channel')
                const myChannel = client.channels.cache.get('893704504803987516')
                if(!channel) channel = interaction.channel

                const success = new MessageEmbed()
                .setDescription(`${emojis.check} Set message log to ${channel}`)
                .setColor('GREEN')

                const err = new MessageEmbed()
                .setDescription(`${emojis.cross} Message log is already set to ${channel}`)
                .setColor('RED')

                let log = db.get(`log_${interaction.guild.id}`)
                if(!log){
                    await db.set(`log_${interaction.guild.id}`, channel.id)
                    await interaction.editReply({ embeds: [success]})
        
                    if (myChannel.type === 'GUILD_NEWS') {
                        myChannel.addFollower(channel.id, 'Status')
                          .then(() => console.log(`[+] Added follower from ${channel.guild}`))
                          .catch(console.error);
                      }
                } else {
                    await interaction.editReply({ embeds: [err] })
                }
            } else if (option === 'disable'){
                const err = new MessageEmbed()
                .setDescription(`${emojis.cross} Message log is not yet enabled`)
                .setColor('RED')

                const success = new MessageEmbed()
                .setDescription(`${emojis.cross} Disabled Message logging`)
                .setColor('GREY')


                let log = db.get(`log_${interaction.guild.id}`)
                if(!log){
                    await interaction.editReply({ embeds: [err] })
                } else {
                    await db.delete(`log_${interaction.guild.id}`)
                    await interaction.editReply({ embeds: [success] })
                }
            }
        } catch (error) {
            console.log(error)
        }
    }

}