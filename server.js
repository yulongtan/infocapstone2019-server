const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const MessagingResponse = require('twilio').twiml.MessagingResponse;

const app = express();

let scraper = require('./scraper');

// Middleware to fill the request body
let rawBodySaver = (req, res, buf, encoding) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
}

app.use(bodyParser.json({ verify: rawBodySaver }));
app.use(bodyParser.urlencoded({ verify: rawBodySaver, extended: true }));
app.use(bodyParser.raw({ verify: rawBodySaver, type: function () { return true } }));

app.post('/sms', (req, res) => {
  const twiml = new MessagingResponse();
  let message = req.body.Body;

  let command = message.split(' ')[0];

  if (command === '!test') {
    console.log('Test was sent');
  }

  if (command === '!drives') {
    let zip = message.split(' ')[1];
    if (!zip) {
      twiml.message('Please input a zip code. Usage: !drives <zipcode>');
    } else {
      let drives = scraper.getTimes(zip);
      twiml.message(JSON.stringify(drives, null, 2));
  }
    }
  //twiml.message(`You typed: ${message}`);

  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end(twiml.toString());
});

let port = process.env.PORT || 5000;
http.createServer(app).listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});
