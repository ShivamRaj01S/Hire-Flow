const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { ApiError } = require("../errors/ApiError");

const uploadDir = path.join(process.cwd(), "uploads", "resumes");
fs.mkdirSync(uploadDir, { recursive: true });

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = ext === ".pdf" || ext === ".docx" ? ext : "";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  }
});

const uploadResume = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (allowedMimeTypes.has(String(file.mimetype || "").toLowerCase())) {
      cb(null, true);
      return;
    }
    cb(new ApiError(400, "Only PDF and DOCX resumes are allowed."));
  }
});

function uploadResumeFile(req, res, next) {
  uploadResume.single("resume")(req, res, (err) => {
    if (!err) {
      next();
      return;
    }
    if (err.code === "LIMIT_FILE_SIZE") {
      next(new ApiError(400, "Resume size must be 8MB or less."));
      return;
    }
    next(err);
  });
}

module.exports = { uploadResumeFile };
