const client = require('../index')

const db = require('quick.db')

const { Permissions } = require('discord.js')

client.on("messageCreate", async (message, guild) => {
    if(message.author.bot) return;
    if(message.channel.type === "dm") return;

    //prefix
    let prefix;
    let prefixes = await db.fetch(`prefix_${message.guild.id}`)
    if(prefixes === null){
        prefix = "+"
    } else {
        prefix = prefixes
    }

    if(message.content === `<@!${client.user.id}> prefix`){
        message.channel.send(`My prefix for this server is **${prefix}**`)
    }

    if(message.content.startsWith(prefix)) {

        const [cmd, ...args] = message.content
        .slice(prefix.length)
        .trim()
        .split(" ");

    const command = client.commands.get(cmd.toLowerCase()) || client.commands.find(c => c.aliases?.includes(cmd.toLowerCase()));

    const channel = message.channel;

    const botPermissionsIn = message.guild.me.permissionsIn(channel);

    if(!botPermissionsIn.has([
        Permissions.FLAGS.SEND_MESSAGES
    ])) return;

    if (!command) return;
    await command.run(client, message, args);
    }
})