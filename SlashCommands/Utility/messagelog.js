const { Client, CommandInteraction } = require('discord.js')
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

                let log = db.get(`log_${interaction.guild.id}`)
                if(!log){
                    await db.set(`log_${interaction.guild.id}`, channel.id)
                    await interaction.editReply(`<:check2:893700435502837801> Set message log to ${channel}`)
        
                    if (myChannel.type === 'GUILD_NEWS') {
                        myChannel.addFollower(channel.id, 'Status')
                          .then(() => console.log(`[+] Added follower from ${channel.guild}`))
                          .catch(console.error);
                      }
                } else {
                    await interaction.editReply(`Message log is already set to ${channel}`)
                }
            } else if (option === 'disable'){
                let log = db.get(`log_${interaction.guild.id}`)
                if(!log){
                    await interaction.editReply('Message log is not enabled')
                } else {
                    await db.delete(`log_${interaction.guild.id}`)
                    await interaction.editReply(`<:check2:893700435502837801> Disabled message log`)
                }
            }
        } catch (error) {
            console.log(error)
        }
    }

}