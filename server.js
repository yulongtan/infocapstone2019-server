const http = require("http");
const express = require("express");
const bodyParser = require("body-parser");
const MessagingResponse = require("twilio").twiml.MessagingResponse;

const app = express();

let scraper = require("./helpers/scraper");
let firebaseHelper = require("./db/FirebaseHelper");

const LOCAL_TEST_NUMBER = '206';
const ENV = 'dev';

// Middleware to fill the request body
let rawBodySaver = (req, res, buf, encoding) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || "utf8");
  }
};

app.use(
  bodyParser.json({
    verify: rawBodySaver
  })
);
app.use(
  bodyParser.urlencoded({
    verify: rawBodySaver,
    extended: true
  })
);
app.use(
  bodyParser.raw({
    verify: rawBodySaver,
    type: function () {
      return true;
    }
  })
);

app.post("/sms", async (req, res) => {
  const twiml = new MessagingResponse();

  const prefix = "!";
  /**
   * IMPORTANT: USE req.body.Body for production and req.rawBody for local testing
   */
  console.log(JSON.stringify(req.body, null, 2));
  console.log(`Number: ${req.body.From}`);
  let message;
  if (env === 'dev') {
    message = req.rawBody;
  } else {
    message = req.body.Body;
  }
  if (message.startsWith(prefix)) {
    let args = message
      .slice(prefix.length)
      .trim()
      .split(/ +/g);
    let command = args.shift().toLowerCase();

    if (command === "test") {
      console.log("Test was sent");
      twiml.message("Test was sent");
    }

    if (command === "drives") {
      let zip = args[0];
      console.log(zip);
      if (!zip) {
        console.log("no zip");
        twiml.message("Please input a zip code. Usage: !drives <zipcode>");
      } else {
        let drives = await scraper.getTimes(zip);
        if (!drives) {
          twiml.message(`Could not retrieve blood drives for zip code ${zip}`);
        } else {
          twiml.message(drives);
        }
      }
    }

    // registers new users
    if (command === "register") {

      let phoneNumber; // for tesing locally
      if (env === 'dev') {
        phoneNumber = LOCAL_TEST_NUMBER;
      } else {
        phoneNumber = req.body.From;
      }

      let res = await firebaseHelper.createNewUser(phoneNumber);
      let message = "";
      if (res) {
        console.log("signed up");
        message = "You have been registered! Here is a list of available commands:\n!drives <zipcode>: Gets nearby blood drives\n!stats: Gets your statistics\n!eligibility: Get your next eligibility date\n!donated: Use to command to mark that you donated";
      } else {
        message = "This number has already been registered.";
        console.log("registered already");
      }
      twiml.message(message);
    }

    // return user stats
    if (command === "stats") {

      let phoneNumber;
      if (env === 'dev') {
        phoneNumber = LOCAL_TEST_NUMBER;
      } else {
        phoneNumber = req.body.From;
      }

      let message = "";
      let res = await firebaseHelper.getUserStats(phoneNumber);
      if (res) {
        if (res.hasDonated) {
          message = "Here are your statistics! \nBlood Type: " + res.bloodType +
            "\nBlood Drawn Date: " + res.bloodDrawnDate +
            "\nNumber of Donations: " + res.timesDonated +
            "\nEstimated Lives Saved: " + res.estimatedLivesSaved +
            "\nPints Donated: " + res.pintsDonated +
            "\nEligibility to Donate Again: " + res.nextEligibleDate;
        } else {
          message = "You haven't donated yet! No stats available";
        }
        console.log(message);
      } else {
        message = "Looks like you have not registered yet!";
        console.log("you have no registered");
      }
      twiml.message(message);
    }

    // just Donated
    if (command === "donated") {

      let phoneNumber;
      if (env === 'dev') {
        phoneNumber = LOCAL_TEST_NUMBER;
      } else {
        phoneNumber = req.body.From;
      }

      let message = "";
      await firebaseHelper.justDonated(phoneNumber);
      let res = await firebaseHelper.getUserStats(phoneNumber);
      if (res) {
        message = "Thanks for Donating! Here are your statistics! \nBlood Type: " + res.bloodType +
          "\nBlood Drawn Date: " + res.bloodDrawnDate +
          "\nNumber of Donations: " + res.timesDonated +
          "\nEstimated Lives Saved: " + res.estimatedLivesSaved +
          "\nPints Donated: " + res.pintsDonated +
          "\nEligibility to Donate Again: " + res.nextEligibleDate;
      } else {
        message = "Looks like you have not registered yet!";
      }
      twiml.message(message);
    }
  }

  res.writeHead(200, {
    "Content-Type": "text/xml"
  });
  res.end(twiml.toString());
});

let port = process.env.PORT || 5000;
http.createServer(app).listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});