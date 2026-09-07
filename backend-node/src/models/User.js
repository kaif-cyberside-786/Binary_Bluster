/**
 * User Model & Schema Validation
 * Phase 1: Establishes the 'users' collection schema and validation rules.
 * No authentication/session logic is implemented here (deferred to Phase 2).
 */
const mongoose = require('mongoose');

const ROLES = [
  'MP',
  'DISTRICT_AUTHORITY',
  'IMPLEMENTING_AGENCY',
  'STATE_NODAL_AUTHORITY',
  'MINISTRY',
  'AUDITOR',
  'ADMIN',
];

const JURISDICTION_LEVELS = [
  'NATIONAL',
  'STATE',
  'DISTRICT',
  'CONSTITUENCY',
  'AGENCY',
];

const jurisdictionSchema = new mongoose.Schema(
  {
    level: {
      type: String,
      required: [true, 'jurisdiction.level is required'],
      enum: {
        values: JURISDICTION_LEVELS,
        message: '{VALUE} is not a valid jurisdiction level',
      },
    },
    state: {
      type: String,
      trim: true,
      required: [
        function () {
          return ['STATE', 'DISTRICT', 'CONSTITUENCY'].includes(this.level);
        },
        'state is required when jurisdiction level is STATE, DISTRICT, or CONSTITUENCY',
      ],
    },
    district: {
      type: String,
      trim: true,
      required: [
        function () {
          return this.level === 'DISTRICT';
        },
        'district is required when jurisdiction level is DISTRICT',
      ],
    },
    constituency: {
      type: String,
      trim: true,
      required: [
        function () {
          return this.level === 'CONSTITUENCY';
        },
        'constituency is required when jurisdiction level is CONSTITUENCY',
      ],
    },
    agency_id: {
      type: String,
      trim: true,
      required: [
        function () {
          return this.level === 'AGENCY';
        },
        'agency_id is required when jurisdiction level is AGENCY',
      ],
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: [true, 'user_id is required'],
      unique: true,
      trim: true,
      match: [
        /^[A-Z0-9_-]{3,50}$/,
        'user_id must be 3-50 uppercase alphanumeric characters, dashes, or underscores',
      ],
    },
    official_email: {
      type: String,
      required: [true, 'official_email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'official_email must be a valid email address'],
    },
    password_hash: {
      type: String,
      required: [true, 'password_hash is required'],
      minlength: [60, 'password_hash must be a valid hash with minimum 60 characters'],
    },
    full_name: {
      type: String,
      required: [true, 'full_name is required'],
      trim: true,
      minlength: [2, 'full_name must have at least 2 characters'],
      maxlength: [100, 'full_name cannot exceed 100 characters'],
    },
    role: {
      type: String,
      required: [true, 'role is required'],
      enum: {
        values: ROLES,
        message: '{VALUE} is not a valid role',
      },
    },
    designation: {
      type: String,
      trim: true,
      maxlength: [100, 'designation cannot exceed 100 characters'],
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
          return /^[6-9]\d{9}$/.test(v);
        },
        message: 'phone must be a valid 10-digit Indian mobile number',
      },
    },
    jurisdiction: {
      type: jurisdictionSchema,
      required: [true, 'jurisdiction is required'],
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    failed_login_attempts: {
      type: Number,
      default: 0,
      min: [0, 'failed_login_attempts cannot be negative'],
    },
    lockout_until: {
      type: Date,
      default: null,
    },
    password_reset_token: {
      type: String,
      default: null,
    },
    password_reset_expires: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'users',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Indexes
userSchema.index({ role: 1 });
userSchema.index({ 'jurisdiction.state': 1, 'jurisdiction.district': 1 });

const User = mongoose.model('User', userSchema);

module.exports = {
  User,
  ROLES,
  JURISDICTION_LEVELS,
};

