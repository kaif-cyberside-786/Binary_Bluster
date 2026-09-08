/**
 * Officer Decision Model
 * Collection: officer_decisions
 * Every material administrative decision per architecture.md §10.1 & rules.md §4
 * Append-only immutable administrative log.
 */
const mongoose = require('mongoose');
const appendOnlyPlugin = require('./plugins/appendOnlyPlugin');

const DECISION_TYPES = [
  'SANCTION',
  'HOLD',
  'REQUEST_CLARIFICATION',
  'REJECT',
  'ORDER_INSPECTION',
  'OVERRIDE_AI_RISK',
  'ESCALATE_TO_STATE',
  'ESCALATE_TO_MINISTRY',
  'APPROVE_PAYMENT',
  'HOLD_PAYMENT',
  'ASSIGN_AGENCY',
  'MARK_IN_PROGRESS',
  'MARK_COMPLETED',
];

const officerDecisionSchema = new mongoose.Schema(
  {
    decision_id: {
      type: String,
      required: [true, 'decision_id is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    project_id: {
      type: String,
      required: [true, 'project_id is required'],
      trim: true,
      uppercase: true,
      index: true,
    },
    officer_id: {
      type: String,
      required: [true, 'officer_id is required'],
      trim: true,
      index: true,
    },
    role: {
      type: String,
      required: [true, 'role is required'],
      trim: true,
    },
    decision: {
      type: String,
      required: [true, 'decision is required'],
      enum: {
        values: DECISION_TYPES,
        message: '{VALUE} is not a valid administrative decision',
      },
    },
    reason: {
      type: String,
      required: [true, 'reason is required for all administrative decisions'],
      trim: true,
      minlength: [5, 'decision reason must have substantive detail (at least 5 characters)'],
    },
    previous_state: {
      type: String,
      required: [true, 'previous_state is required'],
      trim: true,
    },
    new_state: {
      type: String,
      required: [true, 'new_state is required'],
      trim: true,
    },
    override_ai_flags: {
      type: Boolean,
      default: false,
    },
    decided_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    is_real_government_data: {
      type: Boolean,
      default: false,
    },
    is_synthetic: {
      type: Boolean,
      default: false,
    },
  },
  {
    collection: 'officer_decisions',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

officerDecisionSchema.index({ project_id: 1, decided_at: -1 });

officerDecisionSchema.plugin(appendOnlyPlugin);

const OfficerDecision = mongoose.model('OfficerDecision', officerDecisionSchema);

module.exports = {
  OfficerDecision,
  officerDecisionSchema,
  DECISION_TYPES,
};

