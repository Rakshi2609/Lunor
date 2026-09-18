import mongoose from 'mongoose';

const bankAccountSchema = new mongoose.Schema({
  companyId: {
    type: String,
    default: 'default_corp',
    index: true
  },
  code: {
    type: String,
    trim: true,
    index: true // e.g. 'HYD603', 'BNG611', 'CAPEX_MASTER', etc.
  },
  division: {
    type: String,
    enum: ['Capex', 'Opex', 'CC A/c Usage', 'Investments', 'Other'],
    default: 'Opex',
    index: true
  },
  tier: {
    type: String,
    enum: ['Master', 'City Branch', 'Credit', 'Investment'],
    default: 'City Branch',
    index: true
  },
  city: {
    type: String,
    default: '',
    trim: true
  },
  cityCode: {
    type: String,
    default: '',
    trim: true // e.g. 'HYD', 'BNG', 'MUM', 'PUN', 'VIJ', 'NCR'
  },
  accountNumberLast3: {
    type: String,
    default: '',
    trim: true // e.g. '603', '611', '602'
  },
  bankName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  bankCode: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  maskedAccountNumber: {
    type: String,
    required: true,
    trim: true
  },
  accountType: {
    type: String,
    enum: ['Current', 'Savings', 'Overdraft', 'Cash Credit', 'Investment', 'Master'],
    default: 'Current'
  },
  currency: {
    type: String,
    default: 'INR'
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
  statementDate: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Sensitive safety guarantee: Never allow unmasked accounts in output (only last 3 digits)
bankAccountSchema.methods.toJSON = function() {
  const obj = this.toObject();
  if (obj.accountNumber && !obj.accountNumber.startsWith('****')) {
    obj.maskedAccountNumber = `****${obj.accountNumber.slice(-3)}`;
    delete obj.accountNumber;
  }
  return obj;
};

export default mongoose.model('BankAccount', bankAccountSchema);
