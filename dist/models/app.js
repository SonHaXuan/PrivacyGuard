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
  name: String,
  attributes: [Schema.Types.ObjectId],
  purposes: [Schema.Types.ObjectId]
}, {
  timestamps: true,
  toJSON: {
    virtuals: true
  }
});
schema.plugin(_mongooseFindorcreate["default"]);

var _default = _mongoose["default"].model("app", schema);

exports["default"] = _default;
//# sourceMappingURL=app.js.map