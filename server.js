const express = require('express');
const server = express();
const moment = require('moment')
 
server.all('/', (req, res) => {
  res.send(`OK`)
})
 
function keepAlive() {
  server.listen(3000, () => { console.log("Server is Ready!!" + `${moment(Date.now())}`) });
}
 
module.exports = keepAlive;