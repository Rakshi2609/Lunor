import mongoose from 'mongoose';

const cashForecastSchema = new mongoose.Schema({
  companyId: {
    type: String,
    default: 'default_corp',
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  openingCash: {
    type: Number,
    required: true,
    default: 0
  },
  expectedInflows: {
    type: Number,
    required: true,
    default: 0
  },
  actualInflows: {
    type: Number,
    default: 0
  },
  expectedOutflows: {
    type: Number,
    required: true,
    default: 0
  },
  actualOutflows: {
    type: Number,
    default: 0
  },
  expectedClosingCash: {
    type: Number,
    required: true,
    default: 0
  },
  actualClosingCash: {
    type: Number,
    default: 0
  },
  varianceInflows: {
    type: Number,
    default: 0
  },
  varianceOutflows: {
    type: Number,
    default: 0
  },
  varianceClosing: {
    type: Number,
    default: 0
  },
  materialVarianceNotes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

cashForecastSchema.index({ companyId: 1, date: -1 });

export default mongoose.model('CashForecast', cashForecastSchema);
