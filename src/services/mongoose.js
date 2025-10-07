import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";

const { MONGODB_URL } = process.env;
mongoose.connect(MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.log(err);
});

// mongoose.set("debug", true);
