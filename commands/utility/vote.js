const { Client, CommandInteraction, MessageEmbed, MessageActionRow, MessageButton } = require('discord.js')

module.exports = {
    name: 'vote',

    /**
     * @param {Client} client
     * @param {Message} message
     */

    run: async(client, message) => {
        const row = new MessageActionRow()
        .addComponents(
            new MessageButton()
            .setLabel('Vote')
            .setEmoji('<:topgg:903662068052410450>')
            .setURL('https://top.gg/bot/884249240090607637/vote')
            .setStyle('LINK')
        )
        const embed = new MessageEmbed()
        .setTitle('Vote for Snipe')
        .setDescription('Vote available on [Top.gg](https://top.gg/bot/884249240090607637/vote)')
        .setThumbnail(client.user.displayAvatarURL())
        .setFooter('You can vote every 12hrs')
        .setColor('BLUE')

        await message.channel.send({ embeds: [embed], components: [row] }).catch(e => console.log(e))
    }
}