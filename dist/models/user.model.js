"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _mongoose = _interopRequireDefault(require("mongoose"));

var _mongooseFindorcreate = _interopRequireDefault(require("mongoose-findorcreate"));

var Schema = _mongoose["default"].Schema;
var schema = new Schema({
  fullName: String,
  privacyPreference: {
    attributes: [Schema.Types.ObjectId],
    exceptions: [Schema.Types.ObjectId],
    denyAttributes: [Schema.Types.ObjectId],
    allowedPurposes: [Schema.Types.ObjectId],
    prohibitedPurposes: [Schema.Types.ObjectId],
    denyPurposes: [Schema.Types.ObjectId],
    timeofRetention: Number
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true
  }
});
schema.plugin(_mongooseFindorcreate["default"]);

var _default = _mongoose["default"].model("user", schema);

exports["default"] = _default;
//# sourceMappingURL=user.model.js.map