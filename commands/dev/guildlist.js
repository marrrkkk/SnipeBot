const {Client, Message, MessageEmbed, MessageActionRow, MessageButton } = require('discord.js')
const { ownerID } = require('../../config.json')

module.exports = {
    name: 'guildlist',
    aliases: ['gl'],

    /**
     * @param {Client} client
     * @param {Message} message
     * @param {String[]} args
     */

    run: async(client, message, args) => {
        if(message.author.id !== ownerID) return
        if(!message.guild.me.permissions.has('ADMINISTRATOR')) return

        const row = new MessageActionRow()
        .addComponents(
            new MessageButton()
            .setCustomId('left')
            .setEmoji('<:left:898878732167680010>')
            .setStyle('PRIMARY')
        )
        .addComponents(
            new MessageButton()
            .setCustomId('right')
            .setEmoji('<:right:898878732293529620>')
            .setStyle('PRIMARY')
        )

        let i0 = 0
        let i1 = 10
        let page = 1

        let description =
        `Total Servers - ${client.guilds.cache.size}\n\n` +
        client.guilds.cache
          .sort((a, b) => b.memberCount - a.memberCount)
          .map(r => r)
          .map((r, i) => `**${i + 1}** - ${r.name} \n **User:** ${r.members.cache.filter(m => !m.user.bot).size} | **Bot:** ${r.members.cache.filter(m => m.user.bot).size} | **Total Members:** ${r.memberCount}\nID - ${r.id}`)
          .slice(0, 10)
          .join("\n\n");

      const embed = new MessageEmbed()
        .setAuthor(client.user.tag, client.user.displayAvatarURL({dynamic : true}))
        .setColor('BLURPLE')
        .setFooter(`Page - ${page}/${Math.ceil(client.guilds.cache.size / 10)}`)
        .setDescription(description);

        let msg = await message.channel.send({ embeds: [embed], components: [row] });
        const collector = msg.createMessageComponentCollector({ componentType: 'BUTTON'})

      collector.on('collect', async b => {
        b.deferUpdate()
        if(b.user.id !== message.author.id) return
        if(b.customId === 'left'){

            if(page <= 1) return
            if(page > Math.ceil(client.guilds.cache.size / 10)) return

            i0 = i0 - 10
            i1 = i1 - 10
            page = page - 1

            let description1 =
            `Total Servers - ${client.guilds.cache.size}\n\n` +
            client.guilds.cache
              .sort((a, b) => b.memberCount - a.memberCount)
              .map(r => r)
              .map((r, i) => `**${i + 1}** - ${r.name} \n **User:** ${r.members.cache.filter(m => !m.user.bot).size} | **Bot:** ${r.members.cache.filter(m => m.user.bot).size} | **Total Members:** ${r.memberCount}\nID - ${r.id}`)
              .slice(i0, i1)
              .join("\n\n");

            const embed0 = new MessageEmbed()
            .setAuthor(client.user.tag, client.user.displayAvatarURL({dynamic : true}))
            .setColor('BLURPLE')
            .setFooter(`Page - ${page}/${Math.ceil(client.guilds.cache.size / 10)}`)
            .setDescription(description1);

            return await msg.edit({ embeds: [embed0] })
        }

        if(b.customId === 'right'){
          if(page >= Math.ceil(client.guilds.cache.size / 10)) return

            i0 = i0 + 10
            i1 = i1 + 10
            page = page + 1

            let description2 = 
            `Total Servers - ${client.guilds.cache.size}\n\n` +
            client.guilds.cache
              .sort((a, b) => b.memberCount - a.memberCount)
              .map(r => r)
              .map((r, i) => `**${i + 1}** - ${r.name} \n **User:** ${r.members.cache.filter(m => !m.user.bot).size} | **Bot:** ${r.members.cache.filter(m => m.user.bot).size} | **Total Members:** ${r.memberCount}\nID - ${r.id}`)
              .slice(i0, i1)
              .join("\n\n");

            const embed1 = new MessageEmbed()
            .setAuthor(client.user.tag, client.user.displayAvatarURL({dynamic : true}))
            .setColor('BLURPLE')
            .setFooter(`Page - ${page}/${Math.ceil(client.guilds.cache.size / 10)}`)
            .setDescription(description2);

            return await msg.edit({ embeds: [embed1] })
        }
      })
    }
}