import mongoose from "mongoose";
const Schema = mongoose.Schema;
import findOrCreate from "mongoose-findorcreate";

var schema = new Schema(
  {
    userId: Schema.Types.ObjectId,
    hash: String,
    result: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);
schema.plugin(findOrCreate);

export default mongoose.model("evaluateHash", schema);
