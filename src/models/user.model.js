import mongoose from "mongoose";
const Schema = mongoose.Schema;
import findOrCreate from "mongoose-findorcreate";

var schema = new Schema(
  {
    fullName: String,
    privacyPreference: {
      attributes: [Schema.Types.ObjectId],
      exceptions: [Schema.Types.ObjectId],
      denyAttributes: [Schema.Types.ObjectId],
      allowedPurposes: [Schema.Types.ObjectId],
      prohibitedPurposes: [Schema.Types.ObjectId],
      denyPurposes: [Schema.Types.ObjectId],
      timeofRetention: Number,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);
schema.plugin(findOrCreate);

export default mongoose.model("user", schema);
