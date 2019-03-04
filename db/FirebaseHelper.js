let admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.firebase_project_id ||
      require("../firebase_auth.json").project_id,
    clientEmail: process.env.firebase_client_email ||
      require("../firebase_auth.json").client_email,
    privateKey: (
      process.env.firebase_private_key ||
      require("../firebase_auth.json").private_key
    ).replace(/\\n/g, "\n")
  }),
  databaseURL: process.env.firebase_db_url || require("../auth.json").firebase_db_url
});

let db = admin.database();

/**
 *
 * @param {String} phoneNumber -- phone number from Twilio
 *
 * Stores phone number as ID and creates a new user in firebase
 *
 * TODO: If they do exist then what?
 */
async function createNewUser(phoneNumber) {
  console.log(`Creating user with phone number ${phoneNumber}`);
  var ref = db.ref("/users/" + phoneNumber);
  return ref.once("value").then((snapshot) => {
    var userExists = snapshot.exists(); // true
    if (!userExists) {
      db.ref("users/" + phoneNumber).set({
        bloodType: "",
        timesDonated: 0,
        pintsDonated: 0,
        estimatedLivesSaved: 0,
        // Calculate bloodDrawnDate to find eligibleDate?
        bloodDrawnDate: "",
        // add 56 days to bloodDrawnDdate to get eligibleDate
        //  eligibleDate: "", // String or Date
        // first time donor = false, otherwise true
        hasDonated: false,
        // String (Pass/Failed/Flagged)
        pre_assessment_result: "",
        pre_assessment_questions: [""]
      });
      return userExists;
    } else {
      return userExists;
    }
  });
}

/**
 *
 * @param {String} phoneNumber -- phone number to lookup
 *
 * Gets the data associated with the phone number
 */
function getUser(phoneNumber) {
  var ref = db.ref("/users/" + phoneNumber);
  ref.on(
    "value",
    snapshot => {
      console.log(snapshot.val());
      return snapshot.val();
    },
    err => {
      console.log("The read failed: " + err.code);
    }
  );
}

/**
 *
 * @param {String} phoneNumber -- phone number
 *
 * Retrieve's users' statistics by using the phone Number ID
 * 
 *  TODO: Make return pretty
 */
function getUserStats(phoneNumber) {
  var ref = db.ref("/users/" + phoneNumber);
  return ref.once("value").then((snapshot) => {
    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      console.log("Please register");
    }
  });
}

/**
 *
 * @param {String} phoneNumber -- phone number
 *
 * Retrieve's users' statistics by using the phone Number ID
 * Updates value automatically
 * returns boolean (user exists or not)
 * 
 * TODO: update bloodType, bloodDrawnDate
 *  Think about what to do with hasDonated, and preassesment
 */
async function justDonated(phoneNumber) {
  var ref = db.ref("/users/" + phoneNumber);
  return ref.once("value").then((snapshot) => {
    var userExists = snapshot.exists(); // true
    if (userExists) {
      db.ref("users/" + phoneNumber).update({
        bloodType: "", // do something here
        timesDonated: snapshot.val().timesDonated + 1,
        pintsDonated: snapshot.val().pintsDonated + 1,
        estimatedLivesSaved: snapshot.val().estimatedLivesSaved + 3,
        // Calculate bloodDrawnDate to find eligibleDate?
        bloodDrawnDate: "",
        // add 56 days to bloodDrawnDdate to get eligibleDate
        //  eligibleDate: "", // String or Date
        // first time donor = false, otherwise true
        hasDonated: false, // do something here 
        // String (Pass/Failed/Flagged)
        pre_assessment_result: "", // same with here
        pre_assessment_questions: [""] // same with here
      });
      return getUserStats(phoneNumber);
    } else {
      return; // what should it return?
    }
  });
}

module.exports = {
  createNewUser: createNewUser,
  getUserStats: getUserStats,
  justDonated: justDonated
};