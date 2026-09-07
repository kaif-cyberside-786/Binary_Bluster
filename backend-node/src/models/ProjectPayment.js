/**
 * Project Payment Model
 * Collection: project_payments
 * Individual disbursement and payment installments per architecture.md §10.1
 * Append-only financial trail.
 */
const mongoose = require('mongoose');
const appendOnlyPlugin = require('./plugins/appendOnlyPlugin');

const PAYMENT_STATUSES = ['PENDING', 'APPROVED', 'DISBURSED', 'REJECTED'];

const projectPaymentSchema = new mongoose.Schema(
  {
    payment_id: {
      type: String,
      required: [true, 'payment_id is required'],
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
    installment_number: {
      type: Number,
      required: [true, 'installment_number is required'],
      min: [1, 'installment_number must be at least 1'],
    },
    amount: {
      type: Number,
      required: [true, 'amount is required'],
      min: [0, 'amount cannot be negative'],
    },
    payment_date: {
      type: Date,
      default: null,
      index: true,
    },
    status: {
      type: String,
      required: [true, 'status is required'],
      enum: {
        values: PAYMENT_STATUSES,
        message: '{VALUE} is not a valid payment status',
      },
      default: 'PENDING',
    },
    raised_by: {
      type: String,
      required: [true, 'raised_by (user_id) is required'],
      trim: true,
    },
    approved_by: {
      type: String,
      default: null,
      trim: true,
    },
    sanction_order_ref: {
      type: String,
      default: null,
      trim: true,
    },
    voucher_number: {
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
    collection: 'project_payments',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

projectPaymentSchema.index({ project_id: 1, payment_date: -1 });

projectPaymentSchema.plugin(appendOnlyPlugin);

const ProjectPayment = mongoose.model('ProjectPayment', projectPaymentSchema);

module.exports = {
  ProjectPayment,
  projectPaymentSchema,
  PAYMENT_STATUSES,
};

