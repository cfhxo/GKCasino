const paypal = require("@paypal/checkout-server-sdk");
require("dotenv").config();

function environment() {
  let clientId = process.env.PAYPAL_CLIENT_ID;
  let clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (process.env.PAYPAL_MODE === "live") {
    return new paypal.core.LiveEnvironment(clientId, clientSecret);
  } else {
    return new paypal.core.SandboxEnvironment(clientId, clientSecret);
  }
}

function client() {
  return new paypal.core.PayPalHttpClient(environment());
}

module.exports = client();