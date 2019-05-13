let admin = require("firebase-admin");
let _ = require('lodash');

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
  let exists = await userExists(phoneNumber);
  if (!exists) {
    console.log('inside if statement');
    var ref = db.ref("/users/" + phoneNumber);
    return ref.once("value").then((snapshot) => {
      db.ref("users/" + phoneNumber).set({
        bloodType: "",
        timesDonated: 0,
        pintsDonated: 0,
        estimatedLivesSaved: 0,
        bloodDrawnDate: "",
        hasDonated: false, // first time donor = false, otherwise true
        nextEligibleDate: "",
        pre_assessment_result: "", // String (Pass/Failed/Flagged)
        pre_assessment_questions: [""]
      });
      return true;
    });
  } else {
    return false;
  }
}

async function createNewGroup(group) {
  let exists = await groupExists(group.friendlyName);
  if (!exists) {
    let ref = db.ref(`groups/${group.friendlyName}`);
    return ref.once("value").then((snapshot) => {
      db.ref(`groups/${group.friendlyName}`).set({
        name: group.name,
        friendlyName: group.friendlyName,
        createdDate: group.createdDate,
        members: group.members,
        pintsDonated: group.pintsDonated,
      });
      return true;
    });
  } else {
    return false;
  }
}

async function getAllGroups() {
  let ref = db.ref(`groups/`);
  let results = [];
  return ref.once('value').then((snapshot) => {
    snapshot.forEach((s) => {
      results.push(s);
    })
    return results;
  });
}

async function getPersonGroups(uid) {
  let ref = db.ref(`groups/`);
  let results = [];
  return ref.once('value').then((snapshot) => {
    results = _.filter(snapshot.val(), (s) => {
      return s.members[uid];
    });
    return results;
  });
}

async function getGroup(groupName) {
  let ref = db.ref(`groups/${groupName}`);
  return ref.once('value').then((snapshot) => {
    return snapshot.exists() ? snapshot.val() : null;
  });
}

/**
 *
 * @param {String} phoneNumber -- phone number
 *
 * Retrieve's users' statistics by using the phone Number ID
 * Assumption: User Exists
 */
async function getUserStats(phoneNumber) {
  var ref = db.ref("/users/" + phoneNumber);
  return ref.once("value").then((snapshot) => {
    return snapshot.exists() ? snapshot.val() : null;
  });
}

/**
 *
 * @param {String} phoneNumber -- phone number
 *
 * Retrieve's users' statistics by using the phone Number ID
 * Updates value automatically
 * Assumption: User Exists
 * 
 * TODO: update bloodType,
 *  
 */
async function justDonated(phoneNumber) {
  var ref = db.ref("/users/" + phoneNumber);
  return ref.once("value").then((snapshot) => {
    let nextEligibleDate = new Date();
    nextEligibleDate.setDate(nextEligibleDate.getDate() + 56);
    console.log(`Date: ${nextEligibleDate}`)
    let res = snapshot.val();
    db.ref("users/" + phoneNumber).update({
      bloodType: "", // do something here
      timesDonated: res.timesDonated + 1,
      pintsDonated: res.pintsDonated + 1,
      estimatedLivesSaved: res.estimatedLivesSaved + 3,
      bloodDrawnDate: new Date().toDateString(),
      hasDonated: true, // placeholder for now, bc pypark dk what 2 do w/ it
      nextEligibleDate: nextEligibleDate.toDateString(),
      pre_assessment_result: "", // Next Quarter, String (Pass/Failed/Flagged)
      pre_assessment_questions: [""] // Next Quarter
    });
  });
}

async function userExists(phoneNumber) {
  var ref = db.ref("/users/" + phoneNumber);
  return ref.once("value").then((snapshot) => {
    return snapshot.exists(); // true
  });
}

async function groupExists(groupName) {
  var ref = db.ref(`groups/${groupName}`);
  return ref.once('value').then((snapshot) => {
    return snapshot.exists();
  })
}


module.exports = {
  createNewUser: createNewUser,
  getUserStats: getUserStats,
  justDonated: justDonated,
  createNewGroup: createNewGroup,
  getGroup: getGroup,
  getAllGroups: getAllGroups,
  getPersonGroups: getPersonGroups
};