const auth = require('./auth.json');
const sid = auth.twilio_sid;
const token = auth.twilio_token;
const client = require('twilio')(sid, token);

client.messages
  .create({
    body: 'This was sent from Twilio my guy. (I hope I sent this to you, Phillip)',
    from: auth.twilio_number,
    to: auth.phillip_number
  })
  .then(message => {
    console.log(message.sid);
  })