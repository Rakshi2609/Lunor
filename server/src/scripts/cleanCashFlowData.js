import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import BankAccount from '../models/BankAccount.js';
import CashTransaction from '../models/CashTransaction.js';
import CashForecast from '../models/CashForecast.js';
import CashFlowAuditLog from '../models/CashFlowAuditLog.js';
import DailyBalanceSnapshot from '../models/DailyBalanceSnapshot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/task-manager';

export async function cleanCashFlowData() {
  try {
    console.log('Connecting to MongoDB at:', MONGODB_URI);
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }

    const [accRes, txRes, fcRes, auditRes, snapRes] = await Promise.all([
      BankAccount.deleteMany({}),
      CashTransaction.deleteMany({}),
      CashForecast.deleteMany({}),
      CashFlowAuditLog.deleteMany({}),
      DailyBalanceSnapshot.deleteMany({})
    ]);

    console.log('==============================================');
    console.log('🧹 CASH FLOW DATA CLEANED SUCCESSFULLY');
    console.log(`- Bank Accounts Deleted: ${accRes.deletedCount}`);
    console.log(`- Cash Transactions Deleted: ${txRes.deletedCount}`);
    console.log(`- Daily Forecasts Deleted: ${fcRes.deletedCount}`);
    console.log(`- Audit Logs Deleted: ${auditRes.deletedCount}`);
    console.log(`- Daily Snapshots Deleted: ${snapRes.deletedCount}`);
    console.log('==============================================');

    return {
      accounts: accRes.deletedCount,
      transactions: txRes.deletedCount,
      forecasts: fcRes.deletedCount,
      auditLogs: auditRes.deletedCount
    };
  } catch (error) {
    console.error('❌ Error cleaning Cash Flow data:', error);
    throw error;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  cleanCashFlowData().then(() => {
    mongoose.disconnect();
    process.exit(0);
  }).catch(() => {
    process.exit(1);
  });
}
