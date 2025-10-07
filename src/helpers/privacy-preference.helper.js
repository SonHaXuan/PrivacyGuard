import Models from "../models/index.js";
import mongoose from "mongoose";
import chalk from "chalk";
const evaluate = async (
  {
    _id: appId,
    attributes: appAttributes,
    purposes: appPurposes,
    timeofRetention: appTimeofRetention,
  },
  user
) => {
  if (!user) throw new Error("user not exist");
  const { privacyPreference } = user;

  const [
    isAcceptedAttrs,
    isAcceptedPurposes,
    isTimeofRetention,
  ] = await Promise.all([
    // check attributes
    evaluateAttributes(appId, appAttributes, privacyPreference),
    // check attributes
    evaluatePurposes(appId, appPurposes, privacyPreference),
    // check timeofRetention
    evaluateTimeofRetention(appTimeofRetention, privacyPreference),
  ]);

  return isAcceptedAttrs && isAcceptedPurposes && isTimeofRetention;
};

// evaluate timeofRetention between app and upp
const evaluateTimeofRetention = (appTimeofRetention = 0, privacyPreference) => {
  return appTimeofRetention <= privacyPreference.timeofRetention;
};

// evaluate attributes between app and upp
const evaluateAttributes = async (appId, appAttributes, privacyPreference) => {
  const [isAllowed, isExcepted, isDeny] = await Promise.all([
    evaluateAttributeType(appId, appAttributes, privacyPreference, "allow"),
    evaluateAttributeType(appId, appAttributes, privacyPreference, "except"),
    evaluateAttributeType(appId, appAttributes, privacyPreference, "deny"),
  ]);

  console.log(
    isAllowed ? chalk.green("✅") : chalk.red("✖"),
    chalk.blue(
      `ATTRIBUTE - allow: APP: ${JSON.stringify(
        appAttributes
      )} - UPP ${JSON.stringify(privacyPreference.attributes)}`
    )
  );

  console.log(
    !isExcepted ? chalk.green("✅") : chalk.red("✖"),
    chalk.blue(
      `ATTRIBUTE - except: APP: ${JSON.stringify(
        appAttributes
      )} - UPP ${JSON.stringify(privacyPreference.exceptions)}`
    )
  );

  console.log(
    !isDeny ? chalk.green("✅") : chalk.red("✖"),
    chalk.blue(
      `ATTRIBUTE - deny: APP: ${JSON.stringify(
        appAttributes
      )} - UPP ${JSON.stringify(privacyPreference.exceptions)}`
    )
  );

  return isAllowed && !isExcepted && !isDeny;
};

// evaluate attributes by type
const evaluateAttributeType = async (
  appId,
  appAttributes,
  privacyPreference,
  type
) => {
  try {
    let uppAttributes;

    switch (true) {
      case type === "allow": {
        uppAttributes = privacyPreference.attributes;
        break;
      }
      case type === "except": {
        uppAttributes = privacyPreference.exceptions;
        break;
      }
      case type === "deny": {
        uppAttributes = privacyPreference.exceptions;
        break;
      }
      default: {
        throw new Error("type is invalid");
      }
    }

    for (let i = 0; i < appAttributes.length; i++) {
      const appAttributeId = appAttributes[i];
      let appAttribute = await Models.PrivacyPolicy.aggregate([
        { $unwind: "$attributes" },
        {
          $match: {
            "attributes._id": mongoose.Types.ObjectId(appAttributeId.id),
          },
        },
      ]);

      if (!appAttribute[0] || !appAttribute[0].attributes)
        throw new Error(`Attribute ${appAttributeId} not found`);
      // get attribute
      appAttribute = appAttribute[0].attributes;

      const result = await Models.PrivacyPolicy.findOne({
        attributes: {
          $elemMatch: {
            _id: { $in: uppAttributes },
            left: { $lte: appAttribute.left },
            right: { $gte: appAttribute.right },
          },
        },
      });
      if (result) return true;
    }
    return false;
  } catch (err) {
    chalk.red(console.error("evaluateAttributeType: " + err.message));
    throw err;
  }
};

// evaluate attributes between app and upp
const evaluatePurposes = async (appId, appPurposes, privacyPreference) => {
  const [isAllowed, isExcepted, isDeny] = await Promise.all([
    evaluatePurposesType(appId, appPurposes, privacyPreference, "allow"),
    evaluatePurposesType(appId, appPurposes, privacyPreference, "except"),
    evaluatePurposesType(appId, appPurposes, privacyPreference, "deny"),
  ]);

  console.log(
    isAllowed ? chalk.green("✅") : chalk.red("✖"),
    chalk.blue(
      `PURPOSE - allow: APP: ${JSON.stringify(
        appPurposes
      )} - UPP ${JSON.stringify(privacyPreference.allowedPurposes)}`
    )
  );

  console.log(
    !isExcepted ? chalk.green("✅") : chalk.red("✖"),
    chalk.blue(
      `PURPOSE - except: APP: ${JSON.stringify(
        appPurposes
      )} - UPP ${JSON.stringify(privacyPreference.prohibitedPurposes)}`
    )
  );

  console.log(
    !isDeny ? chalk.green("✅") : chalk.red("✖"),
    chalk.blue(
      `PURPOSE - deny: APP: ${JSON.stringify(
        appPurposes
      )} - UPP ${JSON.stringify(privacyPreference.denyPurposes)}`
    )
  );

  return isAllowed && !isExcepted && !isDeny;
};

// evaluate attributes by type
const evaluatePurposesType = async (
  appId,
  appPurposes,
  privacyPreference,
  type
) => {
  let uppAppPurposes;

  switch (true) {
    case type === "allow": {
      uppAppPurposes = privacyPreference.allowedPurposes;
      break;
    }
    case type === "except": {
      uppAppPurposes = privacyPreference.prohibitedPurposes;
      break;
    }
    case type === "deny": {
      uppAppPurposes = privacyPreference.denyPurposes;
      break;
    }
    default: {
      throw new Error("type is invalid");
    }
  }

  for (let i = 0; i < appPurposes.length; i++) {
    const appPurposeId = appPurposes[i];
    let appPurpose = await Models.PrivacyPolicy.aggregate([
      { $unwind: "$purposes" },
      { $match: { "purposes._id": mongoose.Types.ObjectId(appPurposeId.id) } },
    ]);

    if (!appPurpose[0] || !appPurpose[0].purposes)
      throw new Error(`Purpose ${appPurposeId} not found`);
    // get purpose
    appPurpose = appPurpose[0].purposes;

    const result = await Models.PrivacyPolicy.findOne({
      purposes: {
        $elemMatch: {
          _id: { $in: uppAppPurposes },
          left: { $lte: appPurpose.left },
          right: { $gte: appPurpose.right },
        },
      },
    });

    if (result) return true;
  }

  return false;
};
export default {
  evaluate,
};
