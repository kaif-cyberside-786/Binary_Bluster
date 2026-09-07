/**
 * Utilization Certificate (UC) Model
 * Collection: utilization_certificates
 * UC compliance status per disbursement per architecture.md §10.1
 * Append-only compliance record.
 */
const mongoose = require('mongoose');
const appendOnlyPlugin = require('./plugins/appendOnlyPlugin');

const utilizationCertificateSchema = new mongoose.Schema(
  {
    uc_id: {
      type: String,
      required: [true, 'uc_id is required'],
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
    payment_id: {
      type: String,
      required: [true, 'payment_id is required'],
      trim: true,
      uppercase: true,
      index: true,
    },
    is_filed: {
      type: Boolean,
      required: [true, 'is_filed is required'],
      default: false,
    },
    file_ref: {
      type: String,
      default: null,
      trim: true,
    },
    filed_date: {
      type: Date,
      default: null,
    },
    amount_certified: {
      type: Number,
      required: [true, 'amount_certified is required'],
      min: [0, 'amount_certified cannot be negative'],
    },
    uploaded_by: {
      type: String,
      required: [true, 'uploaded_by (user_id) is required'],
      trim: true,
    },
    verified_by: {
      type: String,
      default: null,
      trim: true,
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
    collection: 'utilization_certificates',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

utilizationCertificateSchema.index({ project_id: 1, is_filed: 1 });

utilizationCertificateSchema.plugin(appendOnlyPlugin);

const UtilizationCertificate = mongoose.model(
  'UtilizationCertificate',
  utilizationCertificateSchema
);

module.exports = {
  UtilizationCertificate,
  utilizationCertificateSchema,
};

