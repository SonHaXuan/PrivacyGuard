"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _dotenv = _interopRequireDefault(require("dotenv"));

var _mongoose = _interopRequireDefault(require("mongoose"));

_dotenv["default"].config();

var MONGODB_URL = process.env.MONGODB_URL;

_mongoose["default"].connect(MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

_mongoose["default"].connection.on("error", function (err) {
  // eslint-disable-next-line no-console
  console.log(err);
}); // mongoose.set("debug", true);
//# sourceMappingURL=mongoose.js.map