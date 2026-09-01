const { verifyAccessToken } = require("../utils/jwt");
const sqlModels = require("../models/sql");

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Missing or invalid authorization header." });
  }

  try {
    const decoded = verifyAccessToken(token);
    const User = sqlModels.User;
    const user = await User.findByPk(decoded.sub, {
      attributes: ["id", "email", "role", "created_at"]
    });
    if (!user) {
      return res.status(401).json({ message: "Invalid token subject." });
    }

    req.user = user;
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Authentication failed." });
  }
}

module.exports = { authenticate };
