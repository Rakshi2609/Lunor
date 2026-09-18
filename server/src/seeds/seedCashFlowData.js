import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import BankAccount from '../models/BankAccount.js';
import CashTransaction from '../models/CashTransaction.js';
import CashForecast from '../models/CashForecast.js';
import CashFlowAuditLog from '../models/CashFlowAuditLog.js';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/task-manager';

export async function seedCashFlow() {
  try {
    console.log('Connecting to MongoDB at:', MONGODB_URI);
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }
    console.log('Connected for Cash Flow seed!');

    const adminUser = await User.findOne({ role: 'Admin' });
    const adminId = adminUser ? adminUser._id : new mongoose.Types.ObjectId();

    // 1. Seed Bank Accounts matching exact hierarchical structure (Capex, Opex, CC, Investments)
    console.log('Seeding Hierarchical Bank Accounts...');
    const statementDate = new Date('2026-09-11');

    const bankAccountsData = [
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
        openingBalance: 455550,
        todayInflows: 0,
        todayOutflows: 0,
        closingBalance: 455550,
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
        openingBalance: 1520801,
        todayInflows: 0,
        todayOutflows: 0,
        closingBalance: 1520801,
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
        openingBalance: 762013,
        todayInflows: 0,
        todayOutflows: 0,
        closingBalance: 762013,
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
        openingBalance: 923203,
        todayInflows: 0,
        todayOutflows: 0,
        closingBalance: 923203,
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
        openingBalance: 460070,
        todayInflows: 0,
        todayOutflows: 0,
        closingBalance: 460070,
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
        openingBalance: 270990,
        todayInflows: 0,
        todayOutflows: 0,
        closingBalance: 270990,
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
        openingBalance: 368702,
        todayInflows: 0,
        todayOutflows: 0,
        closingBalance: 368702,
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
        openingBalance: 8114258,
        todayInflows: 1567329,
        todayOutflows: 0,
        closingBalance: 9681587,
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
        openingBalance: 3670282,
        todayInflows: 0,
        todayOutflows: 0,
        closingBalance: 3670282,
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
        openingBalance: 1626789,
        todayInflows: 0,
        todayOutflows: 0,
        closingBalance: 1626789,
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
        openingBalance: 2268671,
        todayInflows: 0,
        todayOutflows: 0,
        closingBalance: 2268671,
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
        openingBalance: 1337217,
        todayInflows: 0,
        todayOutflows: 0,
        closingBalance: 1337217,
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
        openingBalance: 466514,
        todayInflows: 0,
        todayOutflows: 0,
        closingBalance: 466514,
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
        openingBalance: 460224,
        todayInflows: 0,
        todayOutflows: 0,
        closingBalance: 460224,
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
        accountNumberLast3: 'CC1',
        bankName: 'Corporate Credit Line / CC',
        bankCode: 'CC-LINE',
        maskedAccountNumber: '****8860',
        accountType: 'Cash Credit',
        currency: 'INR',
        openingBalance: -700000,
        todayInflows: 0,
        todayOutflows: 0,
        closingBalance: -700000,
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
        accountNumberLast3: 'INV',
        bankName: 'Treasury Liquid Funds & FDs',
        bankCode: 'TREASURY',
        maskedAccountNumber: '****9900',
        accountType: 'Investment',
        currency: 'INR',
        openingBalance: 150000000,
        todayInflows: 472576,
        todayOutflows: 0,
        closingBalance: 150472576,
        statementDate,
        isActive: true
      }
    ];

    const seededAccounts = [];
    for (const acc of bankAccountsData) {
      let doc = await BankAccount.findOne({ code: acc.code });
      if (!doc) {
        doc = await BankAccount.create(acc);
      } else {
        Object.assign(doc, acc);
        await doc.save();
      }
      seededAccounts.push(doc);
    }
    console.log(`Seeded ${seededAccounts.length} Hierarchical Bank Accounts.`);

    const hdfc = seededAccounts.find(a => a.bankCode === 'HDFC');
    const icici = seededAccounts.find(a => a.bankCode === 'ICICI');
    const sbi = seededAccounts.find(a => a.bankCode === 'SBI');

    // 2. Clear old demo cash transactions to avoid duplication
    await CashTransaction.deleteMany({ source: 'SYSTEM_SEED' });
    console.log('Seeding 30+ realistic transactions across the last 30 days...');

    const sampleTransactions = [
      // Today / Recent
      { bank: hdfc, daysAgo: 0, desc: 'NEFT CR-ACRO CORP ENTERPRISE ANNUAL LIC-55021', type: 'CREDIT', amount: 350000, cat: 'Customer Receipts', ref: 'NEFT550219' },
      { bank: icici, daysAgo: 0, desc: 'UPI-AWS CLOUD INFRASTRUCTURE INVOICE #8892', type: 'DEBIT', amount: 48500, cat: 'Office & Rent Expenses', ref: 'UPI889201' },
      { bank: sbi, daysAgo: 0, desc: 'FD SWEEP MONTHLY INTEREST CREDIT', type: 'CREDIT', amount: 13500, cat: 'Bank Charges & Interest', ref: 'INT20260911' },
      { bank: hdfc, daysAgo: 0, desc: 'RTGS DR-CYRIL & CO LEGAL RETAINER Q3', type: 'DEBIT', amount: 75000, cat: 'Vendor Payments', ref: 'RTGS992144' },

      // 1 day ago
      { bank: icici, daysAgo: 1, desc: 'IMPS CR-NEXUS TECH CONSULTING MILESTONE 2', type: 'CREDIT', amount: 180000, cat: 'Customer Receipts', ref: 'IMPS448201' },
      { bank: hdfc, daysAgo: 1, desc: 'NEFT DR-PULSE DIGITAL MARKETING MONTHLY FEE', type: 'DEBIT', amount: 65000, cat: 'Vendor Payments', ref: 'NEFT102948' },
      { bank: hdfc, daysAgo: 1, desc: 'DEBIT CARD-VERCEL ENTERPRISE PRO HOSTING', type: 'DEBIT', amount: 14200, cat: 'Office & Rent Expenses', ref: 'POS902341' },

      // 2 days ago
      { bank: hdfc, daysAgo: 2, desc: 'RTGS CR-APEX RETAIL SOLUTIONS CORP Q3 RETAINER', type: 'CREDIT', amount: 420000, cat: 'Customer Receipts', ref: 'RTGS773210' },
      { bank: icici, daysAgo: 2, desc: 'ACH DR-AIRTEL BROADBAND & FIBRE HQ LEASED LINE', type: 'DEBIT', amount: 18500, cat: 'Office & Rent Expenses', ref: 'ACH339102' },
      { bank: sbi, daysAgo: 2, desc: 'NEFT DR-GST MONTHLY REMITTANCE AUG-2026', type: 'DEBIT', amount: 112000, cat: 'Statutory & Tax (GST/TDS)', ref: 'GST881920' },

      // 3-5 days ago
      { bank: icici, daysAgo: 3, desc: 'SALARY BATCH DISBURSEMENT AUGUST 2026 ENG TEAM', type: 'DEBIT', amount: 450000, cat: 'Payroll & Salaries', ref: 'SAL20260830' },
      { bank: hdfc, daysAgo: 4, desc: 'NEFT CR-FINTECH VENTURES PILOT CONTRACT', type: 'CREDIT', amount: 225000, cat: 'Customer Receipts', ref: 'NEFT883019' },
      { bank: hdfc, daysAgo: 4, desc: 'WEWORK GALAXY BANGALORE OFFICE LEASE', type: 'DEBIT', amount: 185000, cat: 'Office & Rent Expenses', ref: 'NEFT440192' },
      { bank: icici, daysAgo: 5, desc: 'MONGODB ATLAS CLOUD DEDICATED DB BILL', type: 'DEBIT', amount: 32000, cat: 'Office & Rent Expenses', ref: 'POS441920' },
      { bank: sbi, daysAgo: 5, desc: 'TDS QUARTERLY DEPOSIT CHALLAN 281', type: 'DEBIT', amount: 68000, cat: 'Statutory & Tax (GST/TDS)', ref: 'ITAX338192' },

      // 6-10 days ago
      { bank: hdfc, daysAgo: 6, desc: 'NEFT CR-OMEGA LOGISTICS PLATFORM LICENSE', type: 'CREDIT', amount: 195000, cat: 'Customer Receipts', ref: 'NEFT661029' },
      { bank: icici, daysAgo: 7, desc: 'GOOGLE WORKSPACE & CLOUD IDENTITY SEATS', type: 'DEBIT', amount: 22000, cat: 'Office & Rent Expenses', ref: 'POS881920' },
      { bank: hdfc, daysAgo: 8, desc: 'SLACK TECHNOLOGIES ENTERPRISE GRID', type: 'DEBIT', amount: 16500, cat: 'Office & Rent Expenses', ref: 'POS338192' },
      { bank: hdfc, daysAgo: 9, desc: 'IMPS CR-ZENITH LABS SOFTWARE CONSULTING', type: 'CREDIT', amount: 140000, cat: 'Customer Receipts', ref: 'IMPS992019' },
      { bank: icici, daysAgo: 10, desc: 'REIMBURSEMENTS-TEAM TRAVEL & OFFSITE EXPENSES', type: 'DEBIT', amount: 38000, cat: 'Vendor Payments', ref: 'REIMB202609' },

      // 11-15 days ago
      { bank: hdfc, daysAgo: 11, desc: 'RTGS CR-BHARAT CAPITAL ANALYTICS DASHBOARD', type: 'CREDIT', amount: 310000, cat: 'Customer Receipts', ref: 'RTGS441029' },
      { bank: icici, daysAgo: 12, desc: 'CONTRACTOR PAYOUT-FRONTEND SPECIALIST BATCH', type: 'DEBIT', amount: 85000, cat: 'Payroll & Salaries', ref: 'CONT20260901' },
      { bank: sbi, daysAgo: 13, desc: 'BANK CHARGES & CURRENT ACCOUNTS AUDIT FEE', type: 'DEBIT', amount: 2500, cat: 'Bank Charges & Interest', ref: 'CHG449102' },
      { bank: hdfc, daysAgo: 14, desc: 'NEFT CR-HYPERGROWTH LABS API INTEGRATION', type: 'CREDIT', amount: 165000, cat: 'Customer Receipts', ref: 'NEFT339102' },
      { bank: icici, daysAgo: 15, desc: 'GITHUB ENTERPRISE & COPILOT SEATS', type: 'DEBIT', amount: 12500, cat: 'Office & Rent Expenses', ref: 'POS771920' },

      // 16-25 days ago
      { bank: hdfc, daysAgo: 18, desc: 'NEFT CR-STELLAR FINTECH SOFTWARE RETAINER', type: 'CREDIT', amount: 280000, cat: 'Customer Receipts', ref: 'NEFT991023' },
      { bank: icici, daysAgo: 20, desc: 'OFFICE SNACKS, COFFEE & PANTRY SUPPLIES', type: 'DEBIT', amount: 9500, cat: 'Office & Rent Expenses', ref: 'POS551920' },
      { bank: hdfc, daysAgo: 22, desc: 'HARDWARE UPGRADES-MACBOOK M3 MAX ENG LEAD', type: 'DEBIT', amount: 245000, cat: 'Vendor Payments', ref: 'NEFT771829' },
      { bank: sbi, daysAgo: 25, desc: 'PROFESSIONAL TAX PAYMENT HALF YEARLY', type: 'DEBIT', amount: 18000, cat: 'Statutory & Tax (GST/TDS)', ref: 'PTAX881920' }
    ];

    const insertedTxs = [];
    for (const item of sampleTransactions) {
      const txDate = new Date(Date.now() - item.daysAgo * 86400000);
      const rawHash = crypto.createHash('sha256').update(`${item.bank._id}_${txDate.toISOString().split('T')[0]}_${item.amount}_${item.desc}_${item.ref}`).digest('hex');

      const txDoc = await CashTransaction.create({
        companyId: 'default_corp',
        bankId: item.bank._id,
        bankName: item.bank.bankName,
        bankCode: item.bank.bankCode,
        maskedAccountNumber: item.bank.maskedAccountNumber,
        transactionDate: txDate,
        valueDate: txDate,
        description: item.desc,
        type: item.type,
        amount: item.amount,
        balanceAfter: item.type === 'CREDIT' ? item.bank.closingBalance : item.bank.closingBalance - item.amount,
        reference: item.ref,
        category: item.cat,
        source: 'SYSTEM_SEED',
        rawHash,
        isReconciled: true,
        notes: `System seeded mock transaction for ${item.cat}`
      });
      insertedTxs.push(txDoc);
    }
    console.log(`Inserted ${insertedTxs.length} realistic Cash Transactions!`);

    // 3. Seed Daily Cash Forecasts (Last 4 Days + Today + Next 4 Days)
    await CashForecast.deleteMany({});
    console.log('Seeding Daily Cash Forecasts with Variance Analysis...');

    const forecastRows = [
      { offsetDays: -4, expIn: 200000, actIn: 225000, expOut: 200000, actOut: 185000, note: 'Client early milestone cleared; Office lease negotiated down.' },
      { offsetDays: -3, expIn: 150000, actIn: 140000, expOut: 480000, actOut: 450000, note: 'Payroll processed on schedule with zero overhead variances.' },
      { offsetDays: -2, expIn: 400000, actIn: 420000, expOut: 120000, actOut: 130500, note: 'Apex Retail settled early; GST remittance slightly higher due to volume.' },
      { offsetDays: -1, expIn: 150000, actIn: 180000, expOut: 85000, actOut: 79200, note: 'Consulting milestone approved; AWS reserve coupon applied.' },
      { offsetDays: 0,  expIn: 450000, actIn: 485000, expOut: 380000, actOut: 392000, note: 'Acro Corp annual retainer received. Net cash +₹93K today.' },
      { offsetDays: 1,  expIn: 250000, actIn: 0,      expOut: 95000,  actOut: 0,      note: 'Expected pipeline settlement from Hypergrowth Labs.' },
      { offsetDays: 2,  expIn: 180000, actIn: 0,      expOut: 65000,  actOut: 0,      note: 'Quarterly software subscription inflows scheduled.' },
      { offsetDays: 3,  expIn: 320000, actIn: 0,      expOut: 140000, actOut: 0,      note: 'Enterprise renewal batch 2 due.' },
      { offsetDays: 7,  expIn: 500000, actIn: 0,      expOut: 220000, actOut: 0,      note: 'Mid-month retainer clearances.' }
    ];

    let runningCash = 2500000;
    for (const fc of forecastRows) {
      const forecastDate = new Date(Date.now() + fc.offsetDays * 86400000);
      const opening = runningCash;
      const expClosing = opening + fc.expIn - fc.expOut;
      const actClosing = fc.actIn > 0 || fc.actOut > 0 ? opening + fc.actIn - fc.actOut : 0;
      
      const varIn = fc.actIn > 0 ? (fc.actIn - fc.expIn) : 0;
      const varOut = fc.actOut > 0 ? (fc.actOut - fc.expOut) : 0;
      const varClosing = actClosing > 0 ? (actClosing - expClosing) : 0;

      if (actClosing > 0) {
        runningCash = actClosing;
      }

      await CashForecast.create({
        companyId: 'default_corp',
        date: forecastDate,
        openingCash: opening,
        expectedInflows: fc.expIn,
        actualInflows: fc.actIn,
        expectedOutflows: fc.expOut,
        actualOutflows: fc.actOut,
        expectedClosingCash: expClosing,
        actualClosingCash: actClosing,
        varianceInflows: varIn,
        varianceOutflows: varOut,
        varianceClosing: varClosing,
        materialVarianceNotes: fc.note
      });
    }
    console.log('Inserted Daily Cash Forecasts successfully!');

    // 4. Create Initial Audit Log entry
    await CashFlowAuditLog.create({
      companyId: 'default_corp',
      userId: adminId,
      userEmail: adminUser ? adminUser.email : 'rakshithganjimut@gmail.com',
      action: 'SYSTEM_SEED',
      details: {
        accountsCount: seededAccounts.length,
        transactionsCount: insertedTxs.length,
        totalAvailableCash: 2715000
      },
      ipAddress: '127.0.0.1'
    });

    console.log('\n=============================================');
    console.log('✨ CASH FLOW MOCK DATA SEEDED SUCCESSFULLY ✨');
    console.log('🏦 Bank Accounts:');
    console.log('   - HDFC Bank (****4821): ₹14.50 Lakhs');
    console.log('   - ICICI Bank (****6734): ₹8.25 Lakhs');
    console.log('   - State Bank of India (****9012): ₹4.40 Lakhs');
    console.log('💰 Total Cash Available: ₹27.15 Lakhs (₹27,15,000)');
    console.log('📊 Transactions: 29 categorized transactions with auto-tags');
    console.log('📈 Daily Forecast: 9 days with variance calculations');
    console.log('=============================================\n');

  } catch (error) {
    console.error('Error seeding Cash Flow data:', error);
    throw error;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedCashFlow().then(() => {
    mongoose.disconnect();
    process.exit(0);
  }).catch(() => {
    process.exit(1);
  });
}
