/**
 * User Preference Model
 * Collection: user_preferences
 * User workspace and notification settings per architecture.md §10.1
 */
const mongoose = require('mongoose');

const userPreferenceSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: [true, 'user_id is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    email_notifications: {
      type: Boolean,
      default: true,
    },
    risk_alert_threshold: {
      type: String,
      enum: ['ALL', 'MEDIUM_AND_HIGH', 'HIGH_ONLY'],
      default: 'MEDIUM_AND_HIGH',
    },
    default_dashboard_view: {
      type: String,
      default: 'overview',
      trim: true,
    },
    table_page_size: {
      type: Number,
      default: 10,
      min: [5, 'table_page_size must be at least 5'],
      max: [100, 'table_page_size cannot exceed 100'],
    },
    sidebar_collapsed: {
      type: Boolean,
      default: false,
    },
    custom_settings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    collection: 'user_preferences',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

const UserPreference = mongoose.model('UserPreference', userPreferenceSchema);

module.exports = {
  UserPreference,
  userPreferenceSchema,
};

