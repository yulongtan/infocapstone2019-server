const http = require("http");
const express = require("express");
const bodyParser = require("body-parser");
const MessagingResponse = require("twilio").twiml.MessagingResponse;

const app = express();

let scraper = require("./helpers/scraper");
let firebaseHelper = require("./db/FirebaseHelper");

const LOCAL_TEST_NUMBER = '206';

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

  let message = req.body.Body || req.rawBody;
  const phoneNumber = req.body.From || LOCAL_TEST_NUMBER;
  const commandsArray = ["test", "drives", "commands", "updatebloodtype",
    "unsubscribe", "donated", "register", "eligibility", "stats"
  ]

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

    // shows users possible commands
    if (command === "commands") {
      let message = "";
      if (await firebaseHelper.userExists(phoneNumber)) {
        message = "Here is a list of available commands:\n!drives <zipcode>: Gets nearby blood drives\n!stats: Gets your statistics\n!eligibility: Get your next eligibility date\n!donated: To mark that you donated\n!updatebloodtype: To input your blood type\n!unsubscribe: To unsubscribe from Blood Pact";
      } else {
        message = "To use any of these commands please \"!register\" with Blood Pact!\nHere is a list of available commands:\n!drives <zipcode>: Gets nearby blood drives\n!stats: Gets your statistics\n!eligibility: Get your next eligibility date\n!donated: To mark that you donated\n!updatebloodtype: To input your blood type\n!unsubscribe: To unsubscribe from Blood Pact";

      }
      twiml.message(message);
    }

    // registers new users
    if (command === "register") {
      let res = await firebaseHelper.createNewUser(phoneNumber);
      let message = "";
      if (res) {
        message = "Here is a list of available commands:\n!drives <zipcode>: Gets nearby blood drives\n!stats: Gets your statistics\n!eligibility: Get your next eligibility date\n!donated: To mark that you donated\n!updatebloodtype: To input your blood type\n!unsubscribe: To unsubscribe from Blood Pact";
      } else {
        message = "This number has already been registered. Text \"!commands\" to get list of commands!";
      }
      twiml.message(message);
    }

    // return user stats
    if (command === "stats") {
      let message = "";
      let res = await firebaseHelper.getUserStats(phoneNumber);
      if (res) {
        if (res.hasDonated) {
          message =
            "Here are your statistics! \nBlood Type: " +
            res.bloodType +
            "\nBlood Drawn Date: " +
            res.bloodDrawnDate +
            "\nNumber of Donations: " +
            res.timesDonated +
            "\nEstimated Lives Saved: " +
            res.estimatedLivesSaved +
            "\nPints Donated: " +
            res.pintsDonated +
            "\nEligibility to Donate Again: " +
            res.nextEligibleDate;
        } else {
          message = "You haven't donated yet! No stats available";
        }
      } else {
        message = "Looks like you are not registered with Blood Pact. Text \"!register\" to sign up with Blood Pact!";
      }
      twiml.message(message);
    }

    // just Donated
    if (command === "donated") {
      let message = "";
      const res = await firebaseHelper.userExists(phoneNumber);
      if (res) {
        const getStats = await firebaseHelper.getUserStats(phoneNumber);
        if ((getStats.bloodDrawnDate >= getStats.nextEligibleDate) || getStats.bloodDrawnDate == "") {
          await firebaseHelper.justDonated(phoneNumber);
          const stats = await firebaseHelper.getUserStats(phoneNumber);
          message =
            "Thanks for Donating! Here are your statistics! \nBlood Type: " +
            stats.bloodType +
            "\nBlood Drawn Date: " +
            stats.bloodDrawnDate +
            "\nNumber of Donations: " +
            stats.timesDonated +
            "\nEstimated Lives Saved: " +
            stats.estimatedLivesSaved +
            "\nPints Donated: " +
            stats.pintsDonated +
            "\nEligibility to Donate Again: " +
            stats.nextEligibleDate;
        } else {
          message = "You cannot donate yet.\n Eligibility to Donate Again: " + getStats.nextEligibleDate;
        }
      } else {
        message = "Looks like you are not registered with Blood Pact. Text \"!register\" to sign up with Blood Pact!";
      }
      twiml.message(message);
    }

    // return user eligibility
    if (command === "eligibility") {
      let message = "";
      let res = await firebaseHelper.getUserStats(phoneNumber);
      if (res) {
        if (res.hasDonated) {
          message =
            "\nEligibility to Donate Again: " + res.nextEligibleDate;
        } else {
          message = "You haven't donated yet! Donate today!";
        }
        console.log(message);
      } else {
        message = "Looks like you are not registered with Blood Pact. Text \"!register\" to sign up with Blood Pact!";
      }
      twiml.message(message);
    }

    // Delete user from database 
    if (command === "unsubscribe") {
      const res = await firebaseHelper.userExists(phoneNumber);
      if (res) {
        firebaseHelper.deleteUserFromDatabase(phoneNumber);
        message = "You have been unsubscribed to BloodPact.";
      } else {
        message = "Looks like you are not registered with Blood Pact. Text \"!register\" to sign up with Blood Pact!"
      }
      twiml.message(message);
    }

    // Update blood type
    if (command === "updatebloodtype") {
      const bloodType = args[0];
      const res = await firebaseHelper.userExists(phoneNumber);
      if (res) {
        if (firebaseHelper.updateBloodType(bloodType, phoneNumber)) {
          twiml.message("We have updated your blood type: " + bloodType);
        } else {
          twiml.message("Please input a valid blood type.\n Blood Types: O+, O-, A+, A-, B+, B-, AB+, AB-");
        }
      } else {
        twiml.message("Looks like you are not registered with Blood Pact. Text \"!register\" to sign up with Blood Pact!");
      }
    }

    if (!commandsArray.includes(command)) {
      twiml.message("Command is invalid, please try again or text \"!commands\" for a list of commands.");
    }
  } else {
    twiml.message("Command is invalid, please try again or text \"!commands\" for a list of commands.");
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