"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _app = _interopRequireDefault(require("./app.js"));

var _userModel = _interopRequireDefault(require("./user.model.js"));

var _evaluateHashModel = _interopRequireDefault(require("./evaluate-hash.model.js"));

var _privacyPolicyModel = _interopRequireDefault(require("./privacy-policy.model.js"));

var Model = function Model() {
  (0, _classCallCheck2["default"])(this, Model);
  this.App = _app["default"];
  this.User = _userModel["default"];
  this.EvaluateHash = _evaluateHashModel["default"];
  this.PrivacyPolicy = _privacyPolicyModel["default"];
};

var _default = new Model();

exports["default"] = _default;
//# sourceMappingURL=index.js.map