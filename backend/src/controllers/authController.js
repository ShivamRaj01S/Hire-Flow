const { ROLES } = require("../constants/roles");
const { ApiError } = require("../errors/ApiError");
const sqlModels = require("../models/sql");
const { hashPassword, verifyPassword } = require("../utils/password");
const { signAccessToken } = require("../utils/jwt");
const { writeAuditLog } = require("../services/auditService");
const { verifyGoogleIdToken } = require("../services/googleAuthService");

const allowedRoles = new Set([ROLES.CANDIDATE, ROLES.RECRUITER, ROLES.ADMINISTRATOR]);
const allowedGoogleSignupRoles = new Set([ROLES.CANDIDATE, ROLES.RECRUITER]);

async function register(req, res) {
  const { email, password, role } = req.body;
  const User = sqlModels.User;
  if (!email || !password || !role) throw new ApiError(400, "email, password and role are required.");
  if (!allowedRoles.has(role)) throw new ApiError(400, "Invalid role.");
  if (String(password).length < 8) throw new ApiError(400, "Password must be at least 8 characters.");

  const exists = await User.findOne({ where: { email: String(email).toLowerCase().trim() } });
  if (exists) throw new ApiError(409, "User already exists.");

  const user = await User.create({
    email: String(email).toLowerCase().trim(),
    password_hash: await hashPassword(String(password)),
    role
  });

  await writeAuditLog({ userIdentity: user.email, actionPerformed: "REGISTERED_ACCOUNT" });
  return res.status(201).json({ id: user.id, email: user.email, role: user.role });
}

async function login(req, res) {
  const { email, password } = req.body;
  const User = sqlModels.User;
  if (!email || !password) throw new ApiError(400, "email and password are required.");

  const user = await User.findOne({ where: { email: String(email).toLowerCase().trim() } });
  if (!user) throw new ApiError(401, "Invalid credentials.");

  const ok = await verifyPassword(String(password), user.password_hash);
  if (!ok) throw new ApiError(401, "Invalid credentials.");

  const token = signAccessToken({ sub: user.id, role: user.role, email: user.email });
  await writeAuditLog({ userIdentity: user.email, actionPerformed: "LOGGED_IN" });

  return res.json({
    accessToken: token,
    user: { id: user.id, email: user.email, role: user.role, created_at: user.created_at }
  });
}

function me(req, res) {
  return res.json({ user: req.user });
}

async function googleLogin(req, res) {
  const { idToken, role } = req.body;
  const User = sqlModels.User;
  const googleUser = await verifyGoogleIdToken(idToken);

  let user = await User.findOne({ where: { email: googleUser.email } });
  if (!user) {
    const signupRole = allowedGoogleSignupRoles.has(role) ? role : ROLES.CANDIDATE;
    user = await User.create({
      email: googleUser.email,
      password_hash: await hashPassword(`google_oauth_${Date.now()}`),
      role: signupRole
    });
    await writeAuditLog({ userIdentity: user.email, actionPerformed: "REGISTERED_GOOGLE_ACCOUNT" });
  }

  const token = signAccessToken({ sub: user.id, role: user.role, email: user.email });
  await writeAuditLog({ userIdentity: user.email, actionPerformed: "LOGGED_IN_GOOGLE" });

  return res.json({
    accessToken: token,
    user: { id: user.id, email: user.email, role: user.role, created_at: user.created_at }
  });
}

module.exports = { register, login, me, googleLogin };
