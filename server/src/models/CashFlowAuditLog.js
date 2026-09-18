import mongoose from 'mongoose';

const cashFlowAuditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'UNLOCK_CASHFLOW',
      'VIEW_OVERVIEW',
      'VIEW_ACCOUNTS',
      'VIEW_DAILY_POSITION',
      'VIEW_TRANSACTIONS',
      'UPLOAD_STATEMENT',
      'PROCESS_STATEMENT',
      'EXPORT_REPORT',
      'UPDATE_SETTINGS',
      'MANUAL_TRANSACTION_CREATE',
      'SYSTEM_SEED'
    ]
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

cashFlowAuditLogSchema.index({ createdAt: -1 });

export default mongoose.model('CashFlowAuditLog', cashFlowAuditLogSchema);
