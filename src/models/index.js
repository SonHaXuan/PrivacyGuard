import appModel from "./app.js";
import userModel from "./user.model.js";
import evaluateHashModel from "./evaluate-hash.model.js";
import privacyPolicyModel from "./privacy-policy.model.js";
class Model {
  constructor() {
    this.App = appModel;
    this.User = userModel;
    this.EvaluateHash = evaluateHashModel;
    this.PrivacyPolicy = privacyPolicyModel;
  }
}
export default new Model();
