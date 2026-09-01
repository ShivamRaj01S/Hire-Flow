const { OAuth2Client } = require("google-auth-library");
const { ApiError } = require("../errors/ApiError");

let client;

function getGoogleClientId() {
  const v = process.env.GOOGLE_CLIENT_ID;
  if (!v) throw new ApiError(500, "Google auth is not configured.");
  return v;
}

function getClient() {
  if (!client) client = new OAuth2Client(getGoogleClientId());
  return client;
}

async function verifyGoogleIdToken(idToken) {
  if (!idToken) throw new ApiError(400, "idToken is required.");
  const ticket = await getClient().verifyIdToken({
    idToken,
    audience: getGoogleClientId()
  });
  const payload = ticket.getPayload();
  if (!payload?.email || !payload?.email_verified) {
    throw new ApiError(401, "Google account email is not verified.");
  }
  return {
    email: String(payload.email).toLowerCase().trim(),
    name: payload.name || "",
    picture: payload.picture || ""
  };
}

module.exports = { verifyGoogleIdToken };
