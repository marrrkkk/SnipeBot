const client = require('../index')
const { parse } = require('twemoji-parser')

client.on('messageReactionRemove', (messageReaction, user) => {
    try {
        const message = messageReaction.message
        let rsnipes = client.rsnipes.get(message.channel.id) || []
        if(rsnipes.length > 19) rsnipes = rsnipes.slice(0, 19)
    
        let emoji
        let info
        if(messageReaction.emoji.url){
            info = `[${messageReaction.emoji.name}](${messageReaction.emoji.url})`
            emoji = messageReaction.emoji.url
        } else {
            let parsed = parse(messageReaction.emoji, { assetType: "png" })
            info = `[Default emoji](${parsed[0].url})`
            emoji = parsed[0].url
        }
    
        rsnipes.unshift({
            author: user,
            msg: info,
            img: emoji || null,
            link: message.url,
            time: Date.now()
        })
    
        client.rsnipes.set(message.channel.id, rsnipes)
    } catch (error) {
        console.log(error)
    }
})