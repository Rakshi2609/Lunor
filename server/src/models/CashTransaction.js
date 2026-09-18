import mongoose from 'mongoose';

const cashTransactionSchema = new mongoose.Schema({
  companyId: {
    type: String,
    default: 'default_corp',
    index: true
  },
  bankId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount',
    required: true,
    index: true
  },
  bankName: {
    type: String,
    required: true,
    index: true
  },
  bankCode: {
    type: String,
    required: true,
    index: true
  },
  maskedAccountNumber: {
    type: String,
    required: true
  },
  transactionDate: {
    type: Date,
    required: true,
    index: true
  },
  valueDate: {
    type: Date
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['CREDIT', 'DEBIT'],
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  balanceAfter: {
    type: Number
  },
  category: {
    type: String,
    default: 'Uncategorized',
    index: true
  },
  reference: {
    type: String,
    default: '',
    trim: true,
    index: true
  },
  source: {
    type: String,
    default: 'MANUAL_UPLOAD'
  },
  rawHash: {
    type: String,
    index: true
  },
  notes: {
    type: String,
    default: ''
  },
  isReconciled: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Composite index for fast filtering
cashTransactionSchema.index({ companyId: 1, transactionDate: -1, type: 1, category: 1 });

export default mongoose.model('CashTransaction', cashTransactionSchema);
