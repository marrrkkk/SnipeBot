const { Client, Message } = require('discord.js')
const { ownerID } = require('../../config.json')

module.exports = {
    name: 'reload',

    /**
     * @param {Client} client
     * @param {Message} message
     * @param {String[]} args
     */

    run: async(client, message, args) => {
        if(ownerID !== message.author.id) return
        if(!args[0]) return message.reply('<:cross:893700435616100402> Missing __Category__ name')
        if(!args[1]) return message.reply('<:cross:893700435616100402> Missing __Command__ name')

        let category = args[0].toLowerCase()
        let command = args[1].toLowerCase()
        try {
            delete require.cache[require.resolve(`../../commands/${category}/${command}.js`)]
            await client.commands.delete(command)

            const pull = require(`../../commands/${category}/${command}.js`)
            await client.commands.set(command, pull)

            await message.react('✅')
            return await message.channel.send(`Successfully reloaded - \`${command}.js\``)
        } catch (error) {
            message.channel.send(`Error on **${message.author.username}** request:\n\`\`\`${error}\`\`\``)
            .catch(e => console.log(e))
        }
    }
}