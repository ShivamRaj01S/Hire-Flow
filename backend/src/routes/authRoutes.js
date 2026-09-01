const express = require("express");
const { register, login, me, googleLogin } = require("../controllers/authController");
const { asyncHandler } = require("../utils/asyncHandler");
const { authenticate } = require("../middleware/authenticate");

const router = express.Router();

router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login));
router.post("/google", asyncHandler(googleLogin));
router.get("/me", authenticate, asyncHandler(me));

module.exports = { authRoutes: router };
