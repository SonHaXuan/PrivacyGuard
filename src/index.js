require("dotenv").config();
import "./services/mongoose";
import Models from "./models";
import Helpers from "./helpers";
import md5 from "md5";
import moment from "moment";

main();
async function main() {
  // create privacy policy
  await createPrivacyPolicy();
  // data test
  await insertTestData();
  // return; // xoa khi chay xong 2 function tren
  console.time("running time");
  const app = await Models.App.findOne();
  const user = await Models.User.findOne();
  const userId = user.id.toString();
  // // check hash
  const hashValue = md5(
    md5(JSON.stringify(app)) + "-" + md5(JSON.stringify(user.privacyPreference))
  );

  const permission = await Models.EvaluateHash.findOne({
    userId,
    hash: hashValue,
    createdAt: {
      $gte: moment()
        .utc()
        .subtract(Number(user.privacyPreference.timeofRetention), "second"),
    },
  });

  if (permission) {
    console.log("OK" + permission.result);
  } else {
    const isAccepted = await Helpers.PrivacyPreference.evaluate(app, user);

    if (isAccepted) {
      console.log("OK Accepted");
    } else {
      console.log("NO Accepted");
    }
    await Models.EvaluateHash.create({
      userId,
      hash: hashValue,
      result: isAccepted ? "grant" : " deny",
    });
  }

  console.timeEnd("running time");
}

async function createPrivacyPolicy() {
  const hasData = await Models.PrivacyPolicy.findOne({});
  if (hasData) return;

  await Models.PrivacyPolicy.insertMany([
    {
      attributes: [
        { name: "General", left: 1, right: 31 },

        { name: "Identifier", left: 2, right: 7 },
        { name: "UserId", left: 3, right: 4 },
        { name: "Name", left: 5, right: 6 },

        { name: "Generic", left: 7, right: 16 },
        { name: "Fitness", left: 8, right: 15 },
        { name: "Moverment", left: 9, right: 10 },
        { name: "Height", left: 11, right: 12 },
        { name: "Weight", left: 13, right: 14 },

        { name: "Sensitive", left: 17, right: 30 },
        { name: "Position", left: 18, right: 19 },
        { name: "Health", left: 20, right: 29 },
        { name: "Physical state", left: 21, right: 26 },
        { name: "Heart rate", left: 22, right: 23 },
        { name: "Blood pressure", left: 24, right: 25 },
        { name: "Psychological state", left: 27, right: 28 },
      ],
      purposes: [
        { name: "General", left: 1, right: 32 },

        { name: "Admin", left: 2, right: 7 },
        { name: "Profilling", left: 3, right: 4 },
        { name: "Analysis", left: 5, right: 6 },

        { name: "Purchase", left: 8, right: 9 },

        { name: "Shipping", left: 10, right: 11 },

        { name: "Maketing", left: 12, right: 31 },

        { name: "Direct", left: 13, right: 24 },
        { name: "DPhone", left: 14, right: 15 },
        { name: "DEmail", left: 16, right: 21 },
        { name: "Service updates", left: 17, right: 18 },
        { name: "Special offers", left: 19, right: 20 },
        { name: "DFax", left: 22, right: 23 },

        { name: "Third-party", left: 24, right: 30 },
        { name: "TEMail", left: 26, right: 27 },
        { name: "TPostal", left: 28, right: 29 },
      ],
    },
  ]);
}
async function insertTestData() {
  await Models.EvaluateHash.deleteMany({});
  await Models.User.deleteMany({});
  await Models.App.deleteMany({});

  const privacyPolicy = await Models.PrivacyPolicy.findOne({});

  const Moverment = privacyPolicy.attributes.find(
    (item) => item.name === "Moverment"
  );
  const Height = privacyPolicy.attributes.find(
    (item) => item.name === "Height"
  );

  const TPostal = privacyPolicy.purposes.find(
    (item) => item.name === "TPostal"
  );
  const TEMail = privacyPolicy.purposes.find((item) => item.name === "TEMail");
  await Models.User.create({
    privacyPreference: {
      attributes: [Moverment.id], // Moverment
      exceptions: [Height.id], // Height
      denyAttributes: [Height.id], // Height

      allowedPurposes: [TPostal.id], // TPostal
      prohibitedPurposes: [TEMail.id], // TEMail
      denyPurposes: [TEMail.id], // TEMail
      timeofRetention: 1000, // second
    },
  });

  await Models.App.create({
    name: "App 1",
    attributes: [Moverment.id], // Moverment
    purposes: [TPostal.id], // TPostal,
    timeofRetention: 500,
  });
}
