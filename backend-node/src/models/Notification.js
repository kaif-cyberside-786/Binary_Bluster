/**
 * Notification Model
 * Collection: notifications
 * Alert delivery records per architecture.md §10.1
 */
const mongoose = require('mongoose');

const NOTIFICATION_TYPES = [
  'RISK_ALERT',
  'CLARIFICATION_REQUEST',
  'SANCTION_APPROVED',
  'INSPECTION_ASSIGNED',
  'UC_OVERDUE',
  'SYSTEM_ALERT',
];

const notificationSchema = new mongoose.Schema(
  {
    notification_id: {
      type: String,
      required: [true, 'notification_id is required'],
      unique: true,
      trim: true,
    },
    recipient_user_id: {
      type: String,
      required: [true, 'recipient_user_id is required'],
      trim: true,
      index: true,
    },
    type: {
      type: String,
      required: [true, 'type is required'],
      enum: {
        values: NOTIFICATION_TYPES,
        message: '{VALUE} is not a valid notification type',
      },
    },
    title: {
      type: String,
      required: [true, 'title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'message is required'],
      trim: true,
    },
    project_id: {
      type: String,
      default: null,
      trim: true,
    },
    is_read: {
      type: Boolean,
      default: false,
      index: true,
    },
    read_at: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'notifications',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

notificationSchema.index({ recipient_user_id: 1, is_read: 1, created_at: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = {
  Notification,
  notificationSchema,
  NOTIFICATION_TYPES,
};

