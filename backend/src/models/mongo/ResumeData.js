const mongoose = require("mongoose");

const ResumeDataSchema = new mongoose.Schema(
  {
    mysql_user_id: { type: Number, required: true, index: true },
    job_profile_id: { type: Number, required: true, index: true },
    file_url: { type: String, required: true },
    stored_file_path: { type: String, required: true },
    original_file_name: { type: String, required: true },
    mime_type: { type: String, required: true },
    file_size_bytes: { type: Number, required: true, min: 1 },
    raw_extracted_text: { type: String, required: true },
    preprocessed_text: { type: String, required: true },
    matched_skills: { type: [String], default: [] },
    missing_skills: { type: [String], default: [] },
    overall_match_percentage: { type: Number, default: 0, min: 0, max: 100 }
  },
  { timestamps: true, collection: "ResumeData" }
);

const ResumeData = mongoose.models.ResumeData || mongoose.model("ResumeData", ResumeDataSchema);
module.exports = { ResumeData };
