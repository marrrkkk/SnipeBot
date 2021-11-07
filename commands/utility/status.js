const { Client, Message, MessageEmbed, MessageActionRow, MessageButton } = require('discord.js')
const axios = require('axios')

module.exports = {
    name: 'status',

    /**
     * @param {Client} client
     * @param {Message} message
     */

    run: async(client, message) => {
        try {
            axios.get('https://v1.nocodeapi.com/mark/uptime/zBWFLdcplcixrewr?monitors=789257543')
            .then(async (res) => {
                const log = res.data.monitors[0].logs
                let type1 = res.data.monitors[0].logs[1].type
                let type2 = res.data.monitors[0].logs[2].type
                let type3 = res.data.monitors[0].logs[3].type
                let type4 = res.data.monitors[0].logs[4].type
                let type5 = res.data.monitors[0].logs[5].type

                if(type1 === 1){
                    type1 = '<:dnd:893700435670618163> Down'
                } else if (type1 === 2){
                    type1 = '<:online:893700435674808350> Up'
                }
                if(type2 === 1){
                    type2 = '<:dnd:893700435670618163> Down'
                } else if (type2 === 2){
                    type2 = '<:online:893700435674808350> Up'
                }
                if(type3 === 1){
                    type3 = '<:dnd:893700435670618163> Down'
                } else if (type3 === 2){
                    type3 = '<:online:893700435674808350> Up'
                }
                if(type4 === 1){
                    type4 = '<:dnd:893700435670618163> Down'
                } else if (type4 === 2){
                    type4 = '<:online:893700435674808350> Up'
                }
                if(type5 === 1){
                    type5 = '<:dnd:893700435670618163> Down'
                } else if (type5 === 2){
                    type5 = '<:online:893700435674808350> Up'
                }

                const row = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                    .setLabel('Log')
                    .setCustomId('log')
                    .setStyle('SUCCESS')
                )

                const embed = new MessageEmbed()
                .setTitle('Snipe Monitor Status')
                .setThumbnail(client.user.displayAvatarURL())
                .setDescription(`Current Status\n<:online:893700435674808350> Up\n\nSince: <t:${log[1].datetime}>\nUptime: ${res.data.monitors[0].all_time_uptime_ratio}%`)

                let msg = await message.channel.send({ embeds: [embed], components: [row] })
                const collector = msg.createMessageComponentCollector({ componentType: 'BUTTON'})

                collector.on('collect', async b => {
                    if(b.user.id === message.author.id){
                        if(b.customId === 'log'){
                            const logs = new MessageEmbed()
                            .setTitle('<:stats:897012813493583872> Downtime and Uptime logs')
                            .addField(`<t:${log[1].datetime}>`, `Status: ${type1}\nDuration: ${Math.floor(log[1].duration / 60)} Minutes\nDetails: ${log[1].reason.detail} ${log[1].reason.code}`)
                            .addField(`<t:${log[2].datetime}>`, `Status: ${type2}\nDuration: ${Math.floor(log[2].duration / 60)} Minutes\nDetails: ${log[2].reason.detail} ${log[2].reason.code}`)
                            .addField(`<t:${log[3].datetime}>`, `Status: ${type3}\nDuration: ${Math.floor(log[3].duration / 60)} Minutes\nDetails: ${log[3].reason.detail} ${log[3].reason.code}`)
                            .addField(`<t:${log[4].datetime}>`, `Status: ${type4}\nDuration: ${Math.floor(log[4].duration / 60)} Minutes\nDetails: ${log[4].reason.detail} ${log[4].reason.code}`)
                            .addField(`<t:${log[5].datetime}>`, `Status: ${type5}\nDuration: ${Math.floor(log[5].duration / 60)} Minutes\nDetails: ${log[5].reason.detail} ${log[5].reason.code}`)

                            await b.reply({ embeds: [logs], ephemeral: true })
                        }
                    } return
                })
            })
        } catch (error) {
            console.log(error)
            message.channel.send('An error occured')
        }
    }
}