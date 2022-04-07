const { Client, Collection } = require("discord.js");

const client = new Client({
    intents: 32767, allowedMentions: { parse: ['users', 'roles'], repliedUser: false}
});
module.exports = client;

const keepAlive = require('./server.js')

client.commands = new Collection();
client.slashCommands = new Collection();
client.config = require("./config.json");
client.snipes = new Collection()
client.esnipes = new Collection()
client.bsnipes = new Collection()
client.besnipes = new Collection()
client.psnipes = new Collection()
client.ebsnipes = new Collection()
client.usnipes = new Collection()
client.uesnipes = new Collection()
client.fsnipes = new Collection()
client.emsnipes = new Collection()
client.rsnipes = new Collection()
client.cooldown = new Collection()

require("./handler")(client);

keepAlive();

client.login(client.config.token);
