/**
 * Audit Log Model
 * Collection: audit_logs
 * Complete tamper-evident record of all state-changing operations per architecture.md §10.1 & rules.md §9
 * Append-only by design: no update or delete allowed.
 */
const mongoose = require('mongoose');
const appendOnlyPlugin = require('./plugins/appendOnlyPlugin');

const AUDIT_ENTITY_TYPES = [
  'PROJECT',
  'RECOMMENDATION',
  'ENGINEERING_REPORT',
  'PROGRESS',
  'PAYMENT',
  'UTILIZATION_CERTIFICATE',
  'DOCUMENT',
  'INSPECTION',
  'DECISION',
  'USER',
  'SYSTEM_CONFIG',
];

const auditLogSchema = new mongoose.Schema(
  {
    audit_id: {
      type: String,
      required: [true, 'audit_id is required'],
      unique: true,
      trim: true,
    },
    user_id: {
      type: String,
      required: [true, 'user_id is required'],
      trim: true,
      index: true,
    },
    role: {
      type: String,
      required: [true, 'role is required'],
      trim: true,
    },
    action: {
      type: String,
      required: [true, 'action is required'],
      trim: true,
      index: true,
    },
    entity_type: {
      type: String,
      required: [true, 'entity_type is required'],
      enum: {
        values: AUDIT_ENTITY_TYPES,
        message: '{VALUE} is not a valid audit entity type',
      },
      index: true,
    },
    entity_id: {
      type: String,
      required: [true, 'entity_id is required'],
      trim: true,
      index: true,
    },
    project_id: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    previous_state: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    new_state: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    reason: {
      type: String,
      default: null,
      trim: true,
    },
    ip_address: {
      type: String,
      default: null,
      trim: true,
    },
    user_agent: {
      type: String,
      default: null,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    collection: 'audit_logs',
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

auditLogSchema.index({ user_id: 1, timestamp: -1 });
auditLogSchema.index({ entity_type: 1, entity_id: 1, timestamp: -1 });

auditLogSchema.plugin(appendOnlyPlugin);

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = {
  AuditLog,
  auditLogSchema,
  AUDIT_ENTITY_TYPES,
};

