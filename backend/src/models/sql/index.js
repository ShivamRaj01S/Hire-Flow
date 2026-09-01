const { DataTypes } = require("sequelize");
const { getSequelize } = require("../../db/mysql");
const { ROLES } = require("../../constants/roles");

let initialized = false;
const models = {};

function initSqlModels() {
  if (initialized) return models;
  const sequelize = getSequelize();
  if (!sequelize) throw new Error("Sequelize is not initialized. Call connectMySQL() first.");

  const User = sequelize.define(
    "User",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      email: { type: DataTypes.STRING(255), allowNull: false, unique: true, validate: { isEmail: true } },
      password_hash: { type: DataTypes.STRING(255), allowNull: false },
      role: { type: DataTypes.ENUM(ROLES.CANDIDATE, ROLES.RECRUITER, ROLES.ADMINISTRATOR), allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    },
    { tableName: "Users", timestamps: false }
  );

  const JobProfile = sequelize.define(
    "JobProfile",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      recruiter_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      title: { type: DataTypes.STRING(255), allowNull: false },
      required_skills: { type: DataTypes.JSON, allowNull: false },
      status: { type: DataTypes.ENUM("Open", "Closed"), allowNull: false, defaultValue: "Open" }
    },
    { tableName: "JobProfiles", timestamps: true, createdAt: "created_at", updatedAt: "updated_at" }
  );

  const Interview = sequelize.define(
    "Interview",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      candidate_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      recruiter_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      scheduled_time: { type: DataTypes.DATE, allowNull: false },
      meeting_link: { type: DataTypes.STRING(500), allowNull: true },
      status: {
        type: DataTypes.ENUM("PREFERRED", "SCHEDULED", "COMPLETED", "CANCELLED"),
        allowNull: false,
        defaultValue: "PREFERRED"
      }
    },
    { tableName: "Interviews", timestamps: true, createdAt: "created_at", updatedAt: "updated_at" }
  );

  const Application = sequelize.define(
    "Application",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      candidate_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      recruiter_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      job_profile_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      status: {
        type: DataTypes.ENUM("APPLIED", "SHORTLISTED", "SLOT_ASSIGNED", "SLOT_SELECTED", "REJECTED"),
        allowNull: false,
        defaultValue: "APPLIED"
      }
    },
    {
      tableName: "Applications",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        {
          unique: true,
          fields: ["candidate_id", "job_profile_id"]
        }
      ]
    }
  );

  const SlotOffer = sequelize.define(
    "SlotOffer",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      application_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      candidate_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      recruiter_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      scheduled_time: { type: DataTypes.DATE, allowNull: false },
      status: {
        type: DataTypes.ENUM("OFFERED", "SELECTED", "CANCELLED"),
        allowNull: false,
        defaultValue: "OFFERED"
      }
    },
    { tableName: "SlotOffers", timestamps: true, createdAt: "created_at", updatedAt: "updated_at" }
  );

  const AuditLog = sequelize.define(
    "AuditLog",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_identity: { type: DataTypes.STRING(255), allowNull: false },
      action_performed: { type: DataTypes.STRING(500), allowNull: false },
      timestamp: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    },
    { tableName: "AuditLogs", timestamps: false }
  );

  User.hasMany(JobProfile, { foreignKey: "recruiter_id", as: "jobProfiles" });
  JobProfile.belongsTo(User, { foreignKey: "recruiter_id", as: "recruiter" });

  User.hasMany(Interview, { foreignKey: "candidate_id", as: "candidateInterviews" });
  User.hasMany(Interview, { foreignKey: "recruiter_id", as: "recruiterInterviews" });
  Interview.belongsTo(User, { foreignKey: "candidate_id", as: "candidate" });
  Interview.belongsTo(User, { foreignKey: "recruiter_id", as: "recruiter" });

  User.hasMany(Application, { foreignKey: "candidate_id", as: "candidateApplications" });
  User.hasMany(Application, { foreignKey: "recruiter_id", as: "recruiterApplications" });
  JobProfile.hasMany(Application, { foreignKey: "job_profile_id", as: "applications" });
  Application.belongsTo(User, { foreignKey: "candidate_id", as: "candidate" });
  Application.belongsTo(User, { foreignKey: "recruiter_id", as: "recruiter" });
  Application.belongsTo(JobProfile, { foreignKey: "job_profile_id", as: "jobProfile" });

  Application.hasMany(SlotOffer, { foreignKey: "application_id", as: "slotOffers" });
  SlotOffer.belongsTo(Application, { foreignKey: "application_id", as: "application" });
  SlotOffer.belongsTo(User, { foreignKey: "candidate_id", as: "candidate" });
  SlotOffer.belongsTo(User, { foreignKey: "recruiter_id", as: "recruiter" });

  models.User = User;
  models.JobProfile = JobProfile;
  models.Interview = Interview;
  models.AuditLog = AuditLog;
  models.Application = Application;
  models.SlotOffer = SlotOffer;
  models.sequelize = sequelize;

  initialized = true;
  return models;
}

module.exports = {
  initSqlModels,
  get User() {
    return models.User;
  },
  get JobProfile() {
    return models.JobProfile;
  },
  get Interview() {
    return models.Interview;
  },
  get AuditLog() {
    return models.AuditLog;
  },
  get Application() {
    return models.Application;
  },
  get SlotOffer() {
    return models.SlotOffer;
  },
  get sequelize() {
    return models.sequelize;
  }
};
