import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import BankAccount from '../models/BankAccount.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/task-manager';

export async function initCleanAccounts() {
  try {
    console.log('Connecting to MongoDB at:', MONGODB_URI);
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }

    const statementDate = new Date();

    const cleanAccounts = [
      // --- CAPEX DIVISION ---
      {
        code: 'CAPEX_MASTER',
        division: 'Capex',
        tier: 'Master',
        city: 'Corporate HQ',
        cityCode: 'CORP',
        accountNumberLast3: '606',
        bankName: 'Corporate Capex (Master)',
        bankCode: 'CPX-MSTR',
        maskedAccountNumber: '****8606',
        accountType: 'Master',
        currency: 'INR',
        openingBalance: 0,
        todayInflows: 0,
        todayOutflows: 0,
        closingBalance: 0,
        statementDate,
        isActive: true
      },
      {
        code: 'HYD603',
        division: 'Capex',
        tier: 'City Branch',
        city: 'Hyderabad',
        cityCode: 'HYD',
        accountNumberLast3: '603',
        bankName: 'Hyderabad Capex',
        bankCode: 'HDFC',
        maskedAccountNumber: '****4603',
        accountType: 'Current',
        currency: 'INR',
        openingBalance: 0,
        todayInflows: 0,
        todayOutflows: 0,
        closingBalance: 0,
        statementDate,
        isActive: true
      },
      {
        code: 'BNG611',
        division: 'Capex',
        tier: 'City Branch',
        city: 'Bangalore',
        cityCode: 'BNG',
        accountNumberLast3: '611',
        bankName: 'BLR Capex',
        bankCode: 'ICICI',
        maskedAccountNumber: '****5611',
        accountType: 'Current',
        currency: 'INR',
        openingBalance: 0,
        todayInflows: 0,
        todayOutflows: 0,
        closingBalance: 0,
        statementDate,
        isActive: true
      },
      {
        code: 'MUM602',
        division: 'Capex',
        tier: 'City Branch',
        city: 'Mumbai',
        cityCode: 'MUM',
        accountNumberLast3: '602',
        bankName: 'Mumbai Capex',
        bankCode: 'AXIS',
        maskedAccountNumber: '****8602',
        accountType: 'Current',
        currency: 'INR',
        openingBalance: 0,
        todayInflows: 0,
        todayOutflows: 0,
        closingBalance: 0,
        statementDate,
        isActive: true
      },
      {
        code: 'PUN612',
        division: 'Capex',
        tier: 'City Branch',
        city: 'Pune',
        cityCode: 'PUN',
        accountNumberLast3: '612',
        bankName: 'Pune Capex',
        bankCode: 'KOTAK',
        maskedAccountNumber: '****9612',
        accountType: 'Current',
        currency: 'INR',
        openingBalance: 0,
        todayInflows: 0,
        todayOutflows: 0,
        closingBalance: 0,
        statementDate,
        isActive: true
      },
      {
        code: 'VIJ 565',
        division: 'Capex',
        tier: 'City Branch',
        city: 'Vijayawada',
        cityCode: 'VIJ',
        accountNumberLast3: '565',
        bankName: 'Vijayawada Capex',
        bankCode: 'SBI',
        maskedAccountNumber: '****0565',
        accountType: 'Current',
        currency: 'INR',
        openingBalance: 0,
        todayInflows: 0,
        todayOutflows: 0,
        closingBalance: 0,
        statementDate,
        isActive: true
      },
      {
        code: 'NCR653',
        division: 'Capex',
        tier: 'City Branch',
        city: 'Delhi NCR',
        cityCode: 'NCR',
        accountNumberLast3: '653',
        bankName: 'Delhi NCR Capex',
        bankCode: 'HDFC',
        maskedAccountNumber: '****7653',
        accountType: 'Current',
        currency: 'INR',
        openingBalance: 0,
        todayInflows: 0,
        todayOutflows: 0,
        closingBalance: 0,
        statementDate,
        isActive: true
      },

      // --- OPEX DIVISION ---
      {
        code: 'OPEX_MASTER',
        division: 'Opex',
        tier: 'Master',
        city: 'Corporate HQ',
        cityCode: 'CORP',
        accountNumberLast3: '609',
        bankName: 'Corporate Opex (Master)',
        bankCode: 'OPX-MSTR',
        maskedAccountNumber: '****8609',
        accountType: 'Master',
        currency: 'INR',
        openingBalance: 0,
        todayInflows: 0,
        todayOutflows: 0,
        closingBalance: 0,
        statementDate,
        isActive: true
      },
      {
        code: 'HYD605',
        division: 'Opex',
        tier: 'City Branch',
        city: 'Hyderabad',
        cityCode: 'HYD',
        accountNumberLast3: '605',
        bankName: 'Hyderabad Opex',
        bankCode: 'HDFC',
        maskedAccountNumber: '****4605',
        accountType: 'Current',
        currency: 'INR',
        openingBalance: 0,
        todayInflows: 0,
        todayOutflows: 0,
        closingBalance: 0,
        statementDate,
        isActive: true
      },
      {
        code: 'BNG355',
        division: 'Opex',
        tier: 'City Branch',
        city: 'Bangalore',
        cityCode: 'BNG',
        accountNumberLast3: '355',
        bankName: 'BLR Opex',
        bankCode: 'ICICI',
        maskedAccountNumber: '****0355',
        accountType: 'Current',
        currency: 'INR',
        openingBalance: 0,
        todayInflows: 0,
        todayOutflows: 0,
        closingBalance: 0,
        statementDate,
        isActive: true
      },
      {
        code: 'MUM607',
        division: 'Opex',
        tier: 'City Branch',
        city: 'Mumbai',
        cityCode: 'MUM',
        accountNumberLast3: '607',
        bankName: 'Mumbai Opex',
        bankCode: 'AXIS',
        maskedAccountNumber: '****8607',
        accountType: 'Current',
        currency: 'INR',
        openingBalance: 0,
        todayInflows: 0,
        todayOutflows: 0,
        closingBalance: 0,
        statementDate,
        isActive: true
      },
      {
        code: 'PUN611',
        division: 'Opex',
        tier: 'City Branch',
        city: 'Pune',
        cityCode: 'PUN',
        accountNumberLast3: '611',
        bankName: 'Pune Opex',
        bankCode: 'KOTAK',
        maskedAccountNumber: '****9611',
        accountType: 'Current',
        currency: 'INR',
        openingBalance: 0,
        todayInflows: 0,
        todayOutflows: 0,
        closingBalance: 0,
        statementDate,
        isActive: true
      },
      {
        code: 'VIJ 567',
        division: 'Opex',
        tier: 'City Branch',
        city: 'Vijayawada',
        cityCode: 'VIJ',
        accountNumberLast3: '567',
        bankName: 'Vijayawada Opex',
        bankCode: 'SBI',
        maskedAccountNumber: '****0567',
        accountType: 'Current',
        currency: 'INR',
        openingBalance: 0,
        todayInflows: 0,
        todayOutflows: 0,
        closingBalance: 0,
        statementDate,
        isActive: true
      },
      {
        code: 'NCR651',
        division: 'Opex',
        tier: 'City Branch',
        city: 'Delhi NCR',
        cityCode: 'NCR',
        accountNumberLast3: '651',
        bankName: 'Delhi NCR Opex',
        bankCode: 'HDFC',
        maskedAccountNumber: '****7651',
        accountType: 'Current',
        currency: 'INR',
        openingBalance: 0,
        todayInflows: 0,
        todayOutflows: 0,
        closingBalance: 0,
        statementDate,
        isActive: true
      },

      // --- CC A/C USAGE ---
      {
        code: 'CC A/c Usage',
        division: 'CC A/c Usage',
        tier: 'Credit',
        city: 'Corporate HQ',
        cityCode: 'CORP',
        accountNumberLast3: '860',
        bankName: 'Corporate Credit Line / CC',
        bankCode: 'CC-LINE',
        maskedAccountNumber: '****8860',
        accountType: 'Cash Credit',
        currency: 'INR',
        openingBalance: 0,
        todayInflows: 0,
        todayOutflows: 0,
        closingBalance: 0,
        statementDate,
        isActive: true
      },

      // --- INVESTMENTS ---
      {
        code: 'Investments',
        division: 'Investments',
        tier: 'Investment',
        city: 'Corporate HQ',
        cityCode: 'CORP',
        accountNumberLast3: '900',
        bankName: 'Treasury Liquid Funds & FDs',
        bankCode: 'TREASURY',
        maskedAccountNumber: '****9900',
        accountType: 'Investment',
        currency: 'INR',
        openingBalance: 0,
        todayInflows: 0,
        todayOutflows: 0,
        closingBalance: 0,
        statementDate,
        isActive: true
      }
    ];

    for (const acc of cleanAccounts) {
      await BankAccount.findOneAndUpdate(
        { code: acc.code },
        acc,
        { upsert: true, returnDocument: 'after' }
      );
    }

    console.log(`Initialized ${cleanAccounts.length} Clean Zero-Balance Bank Accounts.`);
    return cleanAccounts;
  } catch (err) {
    console.error('❌ Error initializing accounts:', err);
    throw err;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  initCleanAccounts().then(() => {
    mongoose.disconnect();
    process.exit(0);
  }).catch(() => {
    process.exit(1);
  });
}
