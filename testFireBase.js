let admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.firebase_project_id || require('./firebase_auth.json').project_id,
    clientEmail: process.env.firebase_client_email || require('./firebase_auth.json').client_email,
    privateKey: (process.env.firebase_private_key || require('./firebase_auth.json').private_key).replace(/\\n/g, '\n'),
  }),
  databaseURL: process.env.firebase_db_url || require('./auth.json').firebase_db_url
});

var db = admin.database();

// var ref = db.ref("restricted_access/secret_document");
// ref.once("value", function (snapshot) {
//     console.log(snapshot.val());
// });

// param: phone number is grabbed from twilio
// Descr: Stores phone number as ID and creates a new user in firecase
function writeUserData(phoneNumber) {
  db.ref('users/' + phoneNumber).set({
    bloodType: "", // String
    numberOfTimesDonated: 0, // Integer
    numOfPints: 0.0, // Double?
    estimatedLivesSaved: 0, // Integer
    bloodDrawnDate: "", // String or Date 
    // Calculate bloodDrawnDate to find eligibleDate?
    // add 56 days to bloodDrawnDdate to get eligibleDate
    //  eligibleDate: "", // String or Date
    donated: false, // boolean 
    // first time donor = false, otherwise true
    pre_assessment_result: "",
    // String (Pass/Failed/Flagged)
    pre_assessment_questions: [""],
    // Array of questions of concern
    zipcode: [""]
  });
}

// read user data from firebase 
// var userId = firebase.auth().currentUser.uid;
// return firebase.database().ref('/users/' + userId).once('value').then(function (snapshot) {
//     var username = (snapshot.val() && snapshot.val().username) || 'Anonymous';
//     // ...
// });

// Reads the data associated with a given phone number and console logs it
function grabAllUser(phoneNumber) {
  var ref = db.ref("/users/" + phoneNumber);
  ref.on("value", function (snapshot) {
    console.log(snapshot.val());
  }, function (errorObject) {
    console.log("The read failed: " + errorObject.code);
  });
}

// Retrieve's users' statistics by using the phone Number ID
function grabUserStats(phoneNumber) {
  var ref = db.ref("/users/" + phoneNumber);
  ref.orderByChild(phoneNumber).on("child_added", function (snapshot) {
    console.log(snapshot.val().bloodType);

  });

  ref.orderByChild(phoneNumber).on("child_added", function (snapshot) {
    //console.log(snapshot.key + " was " + snapshot.val().height + " meters tall");
    console.log("Blood Type: " + snapshot.val().bloodType + ", Number of Times Donated: " + snapshot.val().numberOfTimesDonated + ", Number of Pints: " + snapshot.val().numOfPints + ", Lives Saved: " + snapshot.val().estimatedLivesSaved);
    // add next eligibility date
  });
}

grabUserStats("253-555-8645");

// function justDonated(phoneNumber) {

// }