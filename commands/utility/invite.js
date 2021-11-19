const { Client, Message, MessageActionRow, MessageButton } = require('discord.js')

module.exports = {
    name: 'invite',

    /**
     * @param {Client} client
     * @param {Message} message
     * @param {String[]} args
     */

    run: async(client, message, args) => {
        const row = new MessageActionRow()
        .addComponents(
            new MessageButton()
            .setLabel('Add Snipe')
            .setURL('https://discord.com/oauth2/authorize?client_id=884249240090607637&scope=applications.commands+bot&permissions=380104984640')
            .setStyle('LINK')
        )
        .addComponents(
            new MessageButton()
            .setLabel('Support Server')
            .setURL('https://discord.gg/WEZkASkcH8')
            .setStyle('LINK')
        )

        message.channel.send({ content: 'Invite **Snipe** to your server!', components: [row] }).catch(e => console.log(e))
    }
}