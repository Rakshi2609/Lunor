import mongoose from 'mongoose';

const dailyBalanceSnapshotSchema = new mongoose.Schema({
  companyId: {
    type: String,
    default: 'default_corp',
    index: true
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount',
    required: true,
    index: true
  },
  accountCode: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  division: {
    type: String,
    enum: ['Capex', 'Opex', 'CC A/c Usage', 'Investments', 'Other'],
    default: 'Opex'
  },
  tier: {
    type: String,
    enum: ['Master', 'City Branch', 'Credit', 'Investment'],
    default: 'City Branch'
  },
  bankName: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  dateStr: {
    type: String, // 'YYYY-MM-DD'
    required: true,
    index: true
  },
  openingBalance: {
    type: Number,
    required: true,
    default: 0
  },
  todayInflows: {
    type: Number,
    default: 0
  },
  todayOutflows: {
    type: Number,
    default: 0
  },
  closingBalance: {
    type: Number,
    required: true,
    default: 0
  },
  source: {
    type: String,
    enum: ['STATEMENT_UPLOAD', 'MANUAL_EDIT', 'TRANSACTION_ROLLUP', 'SYSTEM_INIT'],
    default: 'STATEMENT_UPLOAD'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Ensure unique snapshot per account per date
dailyBalanceSnapshotSchema.index({ accountId: 1, dateStr: 1 }, { unique: true });
dailyBalanceSnapshotSchema.index({ dateStr: 1, division: 1 });

export default mongoose.model('DailyBalanceSnapshot', dailyBalanceSnapshotSchema);
