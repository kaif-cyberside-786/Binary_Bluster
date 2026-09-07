/**
 * Fund Utilization Model
 * Collection: fund_utilization
 * Financial utilization snapshot per MP, year, and quarter.
 */
const mongoose = require('mongoose');

const fundUtilizationSchema = new mongoose.Schema(
  {
    mp_id: {
      type: String,
      required: [true, 'mp_id is required'],
      trim: true,
      index: true,
    },
    financial_year: {
      type: String,
      required: [true, 'financial_year is required'],
      trim: true,
    },
    quarter: {
      type: String,
      enum: ['Q1', 'Q2', 'Q3', 'Q4', 'ANNUAL'],
      default: 'ANNUAL',
    },
    allocated_amount: {
      type: Number,
      required: [true, 'allocated_amount is required'],
      min: [0, 'allocated_amount cannot be negative'],
    },
    sanctioned_amount: {
      type: Number,
      default: 0,
      min: [0, 'sanctioned_amount cannot be negative'],
    },
    expenditure: {
      type: Number,
      required: [true, 'expenditure is required'],
      min: [0, 'expenditure cannot be negative'],
    },
    unspent_balance: {
      type: Number,
      required: [true, 'unspent_balance is required'],
      min: [0, 'unspent_balance cannot be negative'],
    },
    utilization_percentage: {
      type: Number,
      min: [0, 'utilization_percentage cannot be less than 0'],
      max: [100, 'utilization_percentage cannot exceed 100'],
      default: 0,
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
    collection: 'fund_utilization',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

fundUtilizationSchema.index({ mp_id: 1, financial_year: 1, quarter: 1 }, { unique: true });

const FundUtilization = mongoose.model('FundUtilization', fundUtilizationSchema);

module.exports = {
  FundUtilization,
  fundUtilizationSchema,
};

