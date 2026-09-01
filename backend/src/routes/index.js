const express = require("express");
const { authRoutes } = require("./authRoutes");
const { candidateRoutes } = require("./candidateRoutes");
const { recruiterRoutes } = require("./recruiterRoutes");
const { adminRoutes } = require("./adminRoutes");
const { interviewRoutes } = require("./interviewRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/candidate", candidateRoutes);
router.use("/recruiter", recruiterRoutes);
router.use("/admin", adminRoutes);
router.use("/interviews", interviewRoutes);

module.exports = { apiRoutes: router };
