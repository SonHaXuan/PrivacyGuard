"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

require("./services/mongoose");

var _models = _interopRequireDefault(require("./models"));

var _helpers = _interopRequireDefault(require("./helpers"));

var _hashUtils = require("./utils/hashUtils.js");

var _moment = _interopRequireDefault(require("moment"));

require("dotenv").config();

main();

function main() {
  return _main.apply(this, arguments);
}

function _main() {
  _main = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee() {
    var app, user, userId, hashValue, permission, isAccepted;
    return _regenerator["default"].wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return createPrivacyPolicy();

          case 2:
            _context.next = 4;
            return insertTestData();

          case 4:
            // return; // xoa khi chay xong 2 function tren
            console.time("running time");
            _context.next = 7;
            return _models["default"].App.findOne();

          case 7:
            app = _context.sent;
            _context.next = 10;
            return _models["default"].User.findOne();

          case 10:
            user = _context.sent;
            userId = user.id.toString(); // // check hash (using SHA-256)

            hashValue = (0, _hashUtils.computeCacheKey)(app, user.privacyPreference);
            _context.next = 15;
            return _models["default"].EvaluateHash.findOne({
              userId: userId,
              hash: hashValue,
              createdAt: {
                $gte: (0, _moment["default"])().utc().subtract(Number(user.privacyPreference.timeofRetention), "second")
              }
            });

          case 15:
            permission = _context.sent;

            if (!permission) {
              _context.next = 20;
              break;
            }

            console.log("OK" + permission.result);
            _context.next = 26;
            break;

          case 20:
            _context.next = 22;
            return _helpers["default"].PrivacyPreference.evaluate(app, user);

          case 22:
            isAccepted = _context.sent;

            if (isAccepted) {
              console.log("OK Accepted");
            } else {
              console.log("NO Accepted");
            }

            _context.next = 26;
            return _models["default"].EvaluateHash.create({
              userId: userId,
              hash: hashValue,
              result: isAccepted ? "grant" : " deny"
            });

          case 26:
            console.timeEnd("running time");

          case 27:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));
  return _main.apply(this, arguments);
}

function createPrivacyPolicy() {
  return _createPrivacyPolicy.apply(this, arguments);
}

function _createPrivacyPolicy() {
  _createPrivacyPolicy = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2() {
    var hasData;
    return _regenerator["default"].wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return _models["default"].PrivacyPolicy.findOne({});

          case 2:
            hasData = _context2.sent;

            if (!hasData) {
              _context2.next = 5;
              break;
            }

            return _context2.abrupt("return");

          case 5:
            _context2.next = 7;
            return _models["default"].PrivacyPolicy.insertMany([{
              attributes: [{
                name: "General",
                left: 1,
                right: 31
              }, {
                name: "Identifier",
                left: 2,
                right: 7
              }, {
                name: "UserId",
                left: 3,
                right: 4
              }, {
                name: "Name",
                left: 5,
                right: 6
              }, {
                name: "Generic",
                left: 7,
                right: 16
              }, {
                name: "Fitness",
                left: 8,
                right: 15
              }, {
                name: "Moverment",
                left: 9,
                right: 10
              }, {
                name: "Height",
                left: 11,
                right: 12
              }, {
                name: "Weight",
                left: 13,
                right: 14
              }, {
                name: "Sensitive",
                left: 17,
                right: 30
              }, {
                name: "Position",
                left: 18,
                right: 19
              }, {
                name: "Health",
                left: 20,
                right: 29
              }, {
                name: "Physical state",
                left: 21,
                right: 26
              }, {
                name: "Heart rate",
                left: 22,
                right: 23
              }, {
                name: "Blood pressure",
                left: 24,
                right: 25
              }, {
                name: "Psychological state",
                left: 27,
                right: 28
              }],
              purposes: [{
                name: "General",
                left: 1,
                right: 32
              }, {
                name: "Admin",
                left: 2,
                right: 7
              }, {
                name: "Profilling",
                left: 3,
                right: 4
              }, {
                name: "Analysis",
                left: 5,
                right: 6
              }, {
                name: "Purchase",
                left: 8,
                right: 9
              }, {
                name: "Shipping",
                left: 10,
                right: 11
              }, {
                name: "Maketing",
                left: 12,
                right: 31
              }, {
                name: "Direct",
                left: 13,
                right: 24
              }, {
                name: "DPhone",
                left: 14,
                right: 15
              }, {
                name: "DEmail",
                left: 16,
                right: 21
              }, {
                name: "Service updates",
                left: 17,
                right: 18
              }, {
                name: "Special offers",
                left: 19,
                right: 20
              }, {
                name: "DFax",
                left: 22,
                right: 23
              }, {
                name: "Third-party",
                left: 24,
                right: 30
              }, {
                name: "TEMail",
                left: 26,
                right: 27
              }, {
                name: "TPostal",
                left: 28,
                right: 29
              }]
            }]);

          case 7:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));
  return _createPrivacyPolicy.apply(this, arguments);
}

function insertTestData() {
  return _insertTestData.apply(this, arguments);
}

function _insertTestData() {
  _insertTestData = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3() {
    var privacyPolicy, Moverment, Height, TPostal, TEMail;
    return _regenerator["default"].wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.next = 2;
            return _models["default"].EvaluateHash.deleteMany({});

          case 2:
            _context3.next = 4;
            return _models["default"].User.deleteMany({});

          case 4:
            _context3.next = 6;
            return _models["default"].App.deleteMany({});

          case 6:
            _context3.next = 8;
            return _models["default"].PrivacyPolicy.findOne({});

          case 8:
            privacyPolicy = _context3.sent;
            Moverment = privacyPolicy.attributes.find(function (item) {
              return item.name === "Moverment";
            });
            Height = privacyPolicy.attributes.find(function (item) {
              return item.name === "Height";
            });
            TPostal = privacyPolicy.purposes.find(function (item) {
              return item.name === "TPostal";
            });
            TEMail = privacyPolicy.purposes.find(function (item) {
              return item.name === "TEMail";
            });
            _context3.next = 15;
            return _models["default"].User.create({
              privacyPreference: {
                attributes: [Moverment.id],
                // Moverment
                exceptions: [Height.id],
                // Height
                denyAttributes: [Height.id],
                // Height
                allowedPurposes: [TPostal.id],
                // TPostal
                prohibitedPurposes: [TEMail.id],
                // TEMail
                denyPurposes: [TEMail.id],
                // TEMail
                timeofRetention: 1000 // second

              }
            });

          case 15:
            _context3.next = 17;
            return _models["default"].App.create({
              name: "App 1",
              attributes: [Moverment.id],
              // Moverment
              purposes: [TPostal.id],
              // TPostal,
              timeofRetention: 500
            });

          case 17:
          case "end":
            return _context3.stop();
        }
      }
    }, _callee3);
  }));
  return _insertTestData.apply(this, arguments);
}
//# sourceMappingURL=index.js.map