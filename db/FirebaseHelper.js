let admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.firebase_project_id || require('../firebase_auth.json').project_id,
    clientEmail: process.env.firebase_client_email || require('../firebase_auth.json').client_email,
    privateKey: (process.env.firebase_private_key || require('../firebase_auth.json').private_key).replace(/\\n/g, '\n'),
  }),
  databaseURL: process.env.firebase_db_url || require('../auth.json').firebase_db_url
});

let db = admin.database();

// var ref = db.ref("restricted_access/secret_document");
// ref.once("value", function (snapshot) {
//     console.log(snapshot.val());
// });

/**
 * 
 * @param {String} phoneNumber -- phone number from Twilio
 * 
 * Stores phone number as ID and creates a new user in firebase
 * 
 * TODO: Check if user exists. If they do, don't create.
 */
function createNewUser(phoneNumber) {
  db.ref('users/' + phoneNumber).set({
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
}

// read user data from firebase 
// var userId = firebase.auth().currentUser.uid;
// return firebase.database().ref('/users/' + userId).once('value').then(function (snapshot) {
//     var username = (snapshot.val() && snapshot.val().username) || 'Anonymous';
//     // ...
// });

/**
 * 
 * @param {String} phoneNumber -- phone number to lookup
 * 
 * Gets the data associated with the phone numbe
 */
function getUser(phoneNumber) {
  var ref = db.ref("/users/" + phoneNumber);
  ref.on("value", (snapshot) => {
    console.log(snapshot.val());
    return snapshot.val();
  }, (err) => {
    console.log("The read failed: " + err.code);
  });
}

/**
 * 
 * @param {String} phoneNumber -- phone number
 * 
 * Retrieve's users' statistics by using the phone Number ID
 */
function getUserStats(phoneNumber) {
  var ref = db.ref("/users/" + phoneNumber);
  // ref.orderByChild(phoneNumber).on("child_added", (snapshot) => {
  //   console.log(snapshot.val().bloodType);
  // });

  // ref.orderByChild(phoneNumber).on("child_added", (snapshot) => {
  //   let data = snapshot.val();
  //   console.log(`Blood Type: ${data.bloodType}, Number of times Donated: ${data.timesDonated}, Number of pints donated: ${data.pintsDonated}, Lives saved: ${data.estimatedLivesSaved}.`);
  //   // add next eligibility date
  // });
  ref.on('value', (snapshot) => {
    console.log(snapshot.val());
    return snapshot.val();
  }, (err) => {
    console.log(`There was an error: ${err}`);
  })
}

// createNewUser('1234567890');
// getUserStats('1234567890');

// function justDonated(phoneNumber) {

// }

module.exports = {
  createNewUser: createNewUser,
  getUserStats: getUserStats
}