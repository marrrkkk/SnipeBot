const client = require('../index')

const db = require('quick.db')

const { Permissions, MessageEmbed } = require('discord.js')

const { color } = require('../config.json')

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

    const embed = new MessageEmbed()
    .setAuthor(`${client.user.tag}`, client.user.displayAvatarURL())
    .setDescription(`My prefix for this server is **${prefix}**`)
    .setFooter('To change prefix do "s!config prefix <prefix>"')
    .setColor(color)

    if(message.content === `<@!${client.user.id}> prefix`){
        message.channel.send({ embeds: [embed] })
    } else if(message.content === `<@${client.user.id}> prefix`){
        message.channel.send({ embeds: [embed] })
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