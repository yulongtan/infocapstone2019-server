const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const MessagingResponse = require('twilio').twiml.MessagingResponse;

let admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.firebase_project_id || require('./firebase_auth.json').project_id,
    clientEmail: process.env.firebase_client_email || require('./firebase_auth.json').client_email,
    privateKey: (process.env.firebase_private_key || require('./firebase_auth.json').private_key).replace(/\\n/g, '\n'),
  }),
  databaseURL: process.env.firebase_db_url || require('./auth.json').db_url
});

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

app.post('/sms', async (req, res) => {
  const twiml = new MessagingResponse();

  const prefix = '!';
  //let message = req.body.Body;
  let message = req.rawBody;
  if (message.startsWith(prefix)) {
    let args = message.slice(prefix.length).trim().split(/ +/g);
    let command = args.shift().toLowerCase();

    if (command === 'test') {
      console.log('Test was sent');
    }

    if (command === 'drives') {
      let zip = args[0];
      console.log(zip);
      if (!zip) {
        console.log('no zip');
        twiml.message('Please input a zip code. Usage: !drives <zipcode>');
      } else {
        let drives = await scraper.getTimes(zip);
        twiml.message(JSON.stringify(drives, null, 2));
      }
    }
  }
  //twiml.message(`You typed: ${message}`);

  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
});

let port = process.env.PORT || 5000;
http.createServer(app).listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});
