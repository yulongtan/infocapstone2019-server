const http = require("http");
const express = require("express");
const bodyParser = require("body-parser");
const MessagingResponse = require("twilio").twiml.MessagingResponse;
const validator = require('./helpers/validator');
const groupSchema = require('./resources/schemas/GroupSchema');
var cors = require('cors')

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

app.use('/sms',
  bodyParser.json({
    verify: rawBodySaver
  })
);
app.use('/sms',
  bodyParser.urlencoded({
    verify: rawBodySaver,
    extended: true
  })
);
app.use('/sms',
  bodyParser.raw({
    verify: rawBodySaver,
    type: function () {
      return true;
    }
  })
);

app.use(express.json());
app.use(cors());
//app.use(bodyParser.urlencoded({ extended: false }));
//app.use(bodyParser.json());

/**
 * HttpGet
 * This endpoint (given a zipcode) returns a list of nearby drives
 * 
 * @param {Number} zipcode - zip code
 * @return {Object} - Array of Blood Drive responses
 */
app.get('/drives/:zipcode', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  let zipcode = req.params['zipcode'];

  // Send the user a BadRequest(400) because the zip they gave was invalid
  if (!zipcode || !Number(zipcode)) {
    res.send(400, {
      errorMessage: 'Invalid zipcode'
    });
  } else {
    let drives = await scraper.getTimes(zipcode, 5);
    res.json(drives);
  }
});

/**
 * HttpGet
 * Returns all the groups
 */
app.get('/groups/all', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  let data = await firebaseHelper.getAllGroups();
  if (!data) {
    res.status(404).send({
      errorMessage: 'No groups found'
    });
  } else {
    res.status(200).send(data);
  }
})

/**
 * HttpGet
 * Returns the group with the given group name
 * 
 * @param {String} groupName -- name of the group
 */
app.get('/groups/:groupName', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  let groupName = req.params['groupName'];
  let groupData = await firebaseHelper.getGroup(groupName);
  if (!groupData) {
    res.status(404).send({
      errorMessage: `${groupName} not found`
    })
  } else {
    res.status(200).send(groupData);
  }
})

/**
 * HttpPost
 * Creates a new group
 */
app.post('/groups/create', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  console.log(req.body)
  if (!req.body) {
    res.status(400).send({
      errorMessage: "Empty body"
    })
  } else {
    //let isValid = validator.validate(req.body, groupSchema);
    let createdGroup = await firebaseHelper.createNewGroup(req.body);
    if (createdGroup) {
      res.status(200).send({
        message: 'Group created successfully'
      })
    } else {
      res.status(400).send({
        message: 'Group already exists'
      })
    }
  }
})

/**
 * HttpPut
 * Modifies the members of a group
 */
app.put('/groups/:groupName/join', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  let groupName = req.params['groupName'];
  let payload = req.body;
  if (!groupName) {
    res.status(400).send({
      errorMessage: 'Invalid param'
    })
  } else if (!payload) {
    res.status(400).send({
      errorMessage: "Empty body"
    })
  } else {
    try {
      await firebaseHelper.joinGroup(groupName, payload);
      res.status(200).send({
        message: `${groupName} updated!`,
        user: payload
      });
    } catch (err) {
      res.status(500).send({
        errorMessage: err
      })
    }
  }
})

app.put('/groups/:groupName/leave', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  let groupName = req.params['groupName'];
  let payload = req.body;
  if (!groupName) {
    res.status(400).send({
      errorMessage: 'Invalid param'
    })
  } else if (!payload) {
    res.status(400).send({
      errorMessage: "Empty body"
    })
  } else {
    try {
      await firebaseHelper.leaveGroup(groupName, payload.uid);
      res.status(200).send({
        message: `${groupName} updated!`,
      });
    } catch (err) {
      res.status(500).send({
        errorMessage: err
      })
    }
  }
})

app.get('/users/:uid/stats', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  let uid = req.params['uid'];
  let data = await firebaseHelper.getUserWebsiteStats(uid);
  if (!data) {
    res.status(404).send({
      errorMessage: 'User not found'
    })
  } else {
    res.status(200).send(data);
  }
})

/**
 * HttpGet
 * Gets all the groups associated with a user
 * 
 * @param {String} uid -- Firebase uid
 */
app.get('/users/:uid/groups', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  let uid = req.params['uid'];
  let data = await firebaseHelper.getPersonGroups(uid);
  if (!data) {
    res.status(404).send({
      errorMessage: 'No groups found'
    });
  } else {
    res.status(200).send(data);
  }
})

/**
 * HttpPost
 * Hits the Twilio SMS endpoint. 
 */
app.post("/sms", async (req, res) => {
  const twiml = new MessagingResponse();
  /**
   * IMPORTANT: USE req.body.Body for production and req.rawBody for local testing
   */
  console.log(JSON.stringify(req.body, null, 2));
  console.log(`Number: ${req.body.From}`);

  let message = req.body.Body || req.rawBody;
  message = String(message);
  let args = message
    .slice(0)
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
      let drives = await scraper.getTimes(zip, 2, true);
      if (!drives) {
        twiml.message(`Could not retrieve blood drives for zip code ${zip}`);
      } else {
        twiml.message(drives);
      }
    }
  }

  // registers new users
  if (command === "register") {
    let phoneNumber = req.body.From || LOCAL_TEST_NUMBER;

    let res = await firebaseHelper.createNewUser(phoneNumber);
    let message = "";
    if (res) {
      console.log("signed up");
      message =
        "You have been registered! Here is a list of available commands:\ndrives <zipcode>: Gets nearby blood drives\nstats: Gets your statistics\neligibility: Get your next eligibility date\ndonated: Use to command to mark that you donated";
    } else {
      message = "This number has already been registered. Text \"commands\" to get list of commands!";
      console.log("registered already");
    }
    twiml.message(message);
  }

  // return user stats
  if (command === "stats") {
    let phoneNumber = req.body.From || LOCAL_TEST_NUMBER;
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
      console.log(message);
    } else {
      message = "Looks like you have not registered yet!";
      console.log("you have no registered");
    }
    twiml.message(message);
  }

  // just Donated
  if (command === "donated") {
    let phoneNumber = req.body.From || LOCAL_TEST_NUMBER;
    let message = "";
    await firebaseHelper.justDonated(phoneNumber);
    let res = await firebaseHelper.getUserStats(phoneNumber);
    if (res) {
      message =
        "Thanks for Donating! Here are your statistics! \nBlood Type: " +
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
      message = "Looks like you have not registered yet!";
    }
    twiml.message(message);
  }

  // shows users possible commands
  if (command === "commands") {
    let message = "Here is a list of available commands:\ndrives <zipcode>: Gets nearby blood drives\nstats: Gets your statistics\neligibility: Get your next eligibility date\ndonated: Use to command to mark that you donated";

    twiml.message(message);
  }

  // return user eligibility
  if (command === "eligibility") {
    let phoneNumber = req.body.From || LOCAL_TEST_NUMBER;
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
      message = "Looks like you have not registered yet!";
      console.log("you have no registered");
    }
    twiml.message(message);
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