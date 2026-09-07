/**
 * Document Metadata Model
 * Collection: documents
 * References to binary evidence, sanction orders, UCs, and inspection photos per architecture.md §10.1 & rules.md §4
 * Binary files stay out of MongoDB; this collection stores audit metadata only.
 * Append-only by design.
 */
const mongoose = require('mongoose');
const appendOnlyPlugin = require('./plugins/appendOnlyPlugin');

const DOCUMENT_TYPES = [
  'UTILIZATION_CERTIFICATE',
  'DETAILED_PROJECT_REPORT',
  'SANCTION_ORDER',
  'INSPECTION_PHOTO',
  'SITE_MEASUREMENT_SHEET',
  'COMPLETION_CERTIFICATE',
  'OTHER',
];

const documentSchema = new mongoose.Schema(
  {
    document_id: {
      type: String,
      required: [true, 'document_id is required'],
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
    document_type: {
      type: String,
      required: [true, 'document_type is required'],
      enum: {
        values: DOCUMENT_TYPES,
        message: '{VALUE} is not a recognized document type',
      },
      index: true,
    },
    uploader_id: {
      type: String,
      required: [true, 'uploader_id is required'],
      trim: true,
    },
    storage_ref: {
      type: String,
      required: [true, 'storage_ref is required'],
      trim: true,
    },
    file_name: {
      type: String,
      required: [true, 'file_name is required'],
      trim: true,
    },
    mime_type: {
      type: String,
      required: [true, 'mime_type is required'],
      trim: true,
    },
    file_size_bytes: {
      type: Number,
      required: [true, 'file_size_bytes is required'],
      min: [0, 'file_size_bytes cannot be negative'],
    },
    sha256_hash: {
      type: String,
      default: null,
      trim: true,
    },
    uploaded_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    collection: 'documents',
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

documentSchema.index({ project_id: 1, document_type: 1 });

documentSchema.plugin(appendOnlyPlugin);

const Document = mongoose.model('Document', documentSchema);

module.exports = {
  Document,
  documentSchema,
  DOCUMENT_TYPES,
};

