import mongoose from "mongoose";
const Schema = mongoose.Schema;
import findOrCreate from "mongoose-findorcreate";

var schema = new Schema(
  {
    name: String,
    attributes: [Schema.Types.ObjectId],
    purposes: [Schema.Types.ObjectId],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);
schema.plugin(findOrCreate);

export default mongoose.model("app", schema);
