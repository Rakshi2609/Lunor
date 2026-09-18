import fs from 'fs';
import * as xlsx from 'xlsx';
import ExcelJS from 'exceljs';
import BankAccount from '../models/BankAccount.js';
import DailyBalanceSnapshot from '../models/DailyBalanceSnapshot.js';
import CashTransaction from '../models/CashTransaction.js';
import CashForecast from '../models/CashForecast.js';
import CashFlowAuditLog from '../models/CashFlowAuditLog.js';
import ManualUploadSource from '../services/cashflow/ManualUploadSource.js';
import {
  generateCashFlowToken,
  verifyCashFlowPassword,
  logCashFlowAudit
} from '../middleware/cashflowAuth.js';

/**
 * Unlock Cash Flow Module with Environment Password
 */
export const unlockCashFlow = async (req, res) => {
  try {
    const { password } = req.body;

    if (!verifyCashFlowPassword(password)) {
      await logCashFlowAudit(req, 'UNLOCK_CASHFLOW', { status: 'FAILED_INCORRECT_PASSWORD' });
      return res.status(401).json({
        error: 'Incorrect Cash Flow password. Please verify with your system administrator.'
      });
    }

    // Generate 12-hour session token
    const token = generateCashFlowToken(req.user);
    await logCashFlowAudit(req, 'UNLOCK_CASHFLOW', { status: 'SUCCESS' });

    res.json({
      success: true,
      message: 'Cash Flow module unlocked successfully',
      token,
      cashFlowToken: token,
      expiresIn: '12h'
    });
  } catch (error) {
    console.error('❌ unlockCashFlow error:', error);
    res.status(500).json({ error: error.message || 'Failed to unlock Cash Flow module' });
  }
};

/**
 * Check Cash Flow Gate Session Status
 */
export const checkCashFlowStatus = async (req, res) => {
  res.json({
    authenticated: true,
    user: {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role
    }
  });
};

/**
 * 1. Overview Dashboard Metrics
 */
export const getOverview = async (req, res) => {
  try {
    const accounts = await BankAccount.find({ isActive: true }).sort({ bankName: 1 });

    // Aggregate totals
    let totalCash = 0;
    let todayInflows = 0;
    let todayOutflows = 0;

    const bankSummary = accounts.map(acc => {
      totalCash += (acc.closingBalance || 0);
      todayInflows += (acc.todayInflows || 0);
      todayOutflows += (acc.todayOutflows || 0);

      return {
        id: acc._id,
        bankName: acc.bankName,
        bankCode: acc.bankCode,
        maskedAccountNumber: acc.maskedAccountNumber,
        currency: acc.currency,
        openingBalance: acc.openingBalance,
        inflows: acc.todayInflows,
        outflows: acc.todayOutflows,
        closingBalance: acc.closingBalance,
        statementDate: acc.statementDate
      };
    });

    const netMovement = todayInflows - todayOutflows;
    const closingCash = totalCash;

    // Recent 5 transactions
    const recentTransactions = await CashTransaction.find({})
      .sort({ transactionDate: -1, createdAt: -1 })
      .limit(5);

    // 7-day trend history
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const trendData = await CashForecast.find({
      date: { $gte: sevenDaysAgo }
    }).sort({ date: 1 });

    // Category breakdown aggregation
    const categoryAgg = await CashTransaction.aggregate([
      {
        $group: {
          _id: { category: '$category', type: '$type' },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    const totalTransactionsCount = await CashTransaction.countDocuments();

    await logCashFlowAudit(req, 'VIEW_OVERVIEW');

    res.json({
      success: true,
      data: {
        kpis: {
          totalCash,
          todayInflows,
          todayOutflows,
          netPosition: netMovement,
          closingCash
        },
        metrics: {
          totalCash,
          todayInflows,
          todayOutflows,
          netMovement,
          closingCash,
          currency: 'INR'
        },
        bankAccounts: accounts,
        bankSummary,
        recentTransactions,
        categoryBreakdown: categoryAgg,
        totalTransactionsCount,
        trendData
      },
      metrics: {
        totalCash,
        todayInflows,
        todayOutflows,
        netMovement,
        closingCash,
        currency: 'INR'
      },
      bankSummary,
      recentTransactions,
      trendData
    });
  } catch (error) {
    console.error('❌ getOverview error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * 2. Bank Accounts List
 */
export const getBankAccounts = async (req, res) => {
  try {
    const accounts = await BankAccount.find({ isActive: true }).sort({ bankName: 1 });
    await logCashFlowAudit(req, 'VIEW_ACCOUNTS');
    res.json({
      success: true,
      data: accounts,
      accounts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * 3. Daily Cash Position & Variance
 */
export const getDailyPosition = async (req, res) => {
  try {
    const requestedDateStr = req.query.date || new Date().toISOString().split('T')[0];
    const targetDate = new Date(requestedDateStr);
    targetDate.setHours(0, 0, 0, 0);

    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    // Find or compute forecast
    let forecast = await CashForecast.findOne({
      date: { $gte: targetDate, $lt: nextDate }
    });

    // Compute actuals from transactions for this day
    const dayTransactions = await CashTransaction.find({
      transactionDate: { $gte: targetDate, $lt: nextDate }
    });

    let actualInflows = 0;
    let actualOutflows = 0;

    for (const t of dayTransactions) {
      if (t.type === 'CREDIT') actualInflows += t.amount;
      else if (t.type === 'DEBIT') actualOutflows += t.amount;
    }

    // If no explicit forecast record exists, synthesize default baseline
    if (!forecast) {
      const accounts = await BankAccount.find({ isActive: true });
      const opening = accounts.reduce((sum, a) => sum + (a.openingBalance || 0), 0);
      const expIn = 500000;
      const expOut = 400000;

      forecast = {
        date: targetDate,
        openingCash: opening,
        expectedInflows: expIn,
        actualInflows: actualInflows,
        expectedOutflows: expOut,
        actualOutflows: actualOutflows,
        expectedClosingCash: opening + expIn - expOut,
        actualClosingCash: opening + actualInflows - actualOutflows,
        varianceInflows: actualInflows - expIn,
        varianceOutflows: expOut - actualOutflows,
        varianceClosing: (opening + actualInflows - actualOutflows) - (opening + expIn - expOut),
        materialVarianceNotes: 'Daily actuals synchronized with active bank accounts and verified transactions.'
      };
    } else {
      // Update with live actuals if available
      if (actualInflows > 0 || actualOutflows > 0) {
        forecast.actualInflows = actualInflows;
        forecast.actualOutflows = actualOutflows;
        forecast.actualClosingCash = forecast.openingCash + actualInflows - actualOutflows;
        forecast.varianceInflows = actualInflows - forecast.expectedInflows;
        forecast.varianceOutflows = forecast.expectedOutflows - actualOutflows;
        forecast.varianceClosing = forecast.actualClosingCash - forecast.expectedClosingCash;
      }
    }

    await logCashFlowAudit(req, 'VIEW_DAILY_POSITION', { date: requestedDateStr });

    const recentForecasts = await CashForecast.find({}).sort({ date: 1 }).limit(14);

    res.json({
      success: true,
      data: {
        date: requestedDateStr,
        summary: {
          openingCash: forecast.openingCash,
          actualInflows: forecast.actualInflows || 0,
          actualOutflows: forecast.actualOutflows || 0,
          closingCash: forecast.actualClosingCash || forecast.expectedClosingCash
        },
        forecast,
        recentForecasts
      },
      date: requestedDateStr,
      position: forecast
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * 4. Transactions with Multi-Filter
 */
export const getTransactions = async (req, res) => {
  try {
    const {
      search,
      bankId,
      bankCode,
      type,
      category,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    const query = {};

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ description: regex }, { reference: regex }, { category: regex }, { counterparty: regex }];
    }

    if (bankId && bankId !== 'ALL') {
      query.bankId = bankId;
    } else if (bankCode && bankCode !== 'ALL') {
      query.bankCode = bankCode.toUpperCase();
    }

    if (type && type !== 'ALL') {
      query.type = type.toUpperCase();
    }

    if (category && category !== 'ALL') {
      query.category = category;
    }

    if (startDate || endDate) {
      query.transactionDate = {};
      if (startDate) query.transactionDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.transactionDate.$lte = end;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await CashTransaction.countDocuments(query);
    const transactions = await CashTransaction.find(query)
      .sort({ transactionDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    await logCashFlowAudit(req, 'VIEW_TRANSACTIONS', { total, page });

    res.json({
      success: true,
      data: transactions,
      transactions,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * 5. Manual Statement Upload & Instant Raw File Destruction
 */
/**
 * 5. Manual Statement Upload & Instant Raw File Destruction
 */

/**
 * Helper: Fetch account balances for a specific date (day selection)
 */
async function getAccountBalancesForDate(selectedDateStr) {
  const accounts = await BankAccount.find({ isActive: true }).sort({ code: 1 });
  const snapshots = await DailyBalanceSnapshot.find({ dateStr: selectedDateStr });
  const snapshotMap = new Map();
  for (const snap of snapshots) {
    snapshotMap.set(snap.accountId.toString(), snap);
    snapshotMap.set(snap.accountCode, snap);
  }

  const targetDate = new Date(selectedDateStr);
  targetDate.setHours(0, 0, 0, 0);
  const nextDate = new Date(targetDate);
  nextDate.setDate(nextDate.getDate() + 1);

  const dayTransactions = await CashTransaction.find({
    transactionDate: { $gte: targetDate, $lt: nextDate }
  });

  const txMap = new Map();
  for (const t of dayTransactions) {
    const key = t.bankId?.toString();
    if (!txMap.has(key)) txMap.set(key, { credit: 0, debit: 0 });
    const stat = txMap.get(key);
    if (t.type === "CREDIT") stat.credit += t.amount;
    else if (t.type === "DEBIT") stat.debit += t.amount;
  }

  return accounts.map(a => {
    const accObj = a.toObject();
    const snap = snapshotMap.get(a._id.toString()) || snapshotMap.get(a.code);
    const tx = txMap.get(a._id.toString());

    if (snap) {
      accObj.openingBalance = snap.openingBalance;
      accObj.todayInflows = snap.todayInflows;
      accObj.todayOutflows = snap.todayOutflows;
      accObj.closingBalance = snap.closingBalance;
    } else if (tx && (tx.credit > 0 || tx.debit > 0)) {
      accObj.todayInflows = tx.credit;
      accObj.todayOutflows = tx.debit;
      accObj.closingBalance = accObj.openingBalance + tx.credit - tx.debit;
    } else {
      accObj.todayInflows = 0;
      accObj.todayOutflows = 0;
      accObj.closingBalance = accObj.openingBalance;
    }
    return accObj;
  });
}

/**
 * Helper: Upsert daily balance snapshot for date
 */
async function saveDailyAccountSnapshot(account, dateStr, source = "STATEMENT_UPLOAD") {
  const dateObj = new Date(dateStr);
  dateObj.setHours(0, 0, 0, 0);

  await DailyBalanceSnapshot.findOneAndUpdate(
    { accountId: account._id, dateStr },
    {
      companyId: account.companyId || "default_corp",
      accountId: account._id,
      accountCode: account.code,
      division: account.division,
      tier: account.tier,
      bankName: account.bankName,
      date: dateObj,
      dateStr,
      openingBalance: account.openingBalance,
      todayInflows: account.todayInflows,
      todayOutflows: account.todayOutflows,
      closingBalance: account.closingBalance,
      source,
      metadata: { lastUpdated: new Date() }
    },
    { upsert: true, returnDocument: 'after' }
  );
}

/**
 * Helper to process a single bank statement file buffer safely
 */
async function processSingleStatement({ filePath, originalname, bankCode, accountId, bankId, code, targetDateStr, req }) {
  let fileBuffer = null;
  try {
    fileBuffer = fs.readFileSync(filePath);
  } finally {
    // Zero Raw File Retention: Always unlink immediately after reading into buffer
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {}
    }
  }

  // Process & Normalize via BankDataSource
  const uploader = new ManualUploadSource();
  const parseResult = await uploader.normalizeTransactions(fileBuffer, {
    originalname,
    bankCode: (bankCode || 'HDFC').toUpperCase(),
    statementDate: new Date(targetDateStr)
  });

  const summary = parseResult.summary || {};
  const normalizedTxns = parseResult.transactions || [];

  // Multi-Account Hierarchy Sheet detected (e.g. Bank_Balance_YYYY-MM-DD.xlsx)
  if (parseResult.hierarchyAccounts && parseResult.hierarchyAccounts.length > 0) {
    let updatedAccountsCount = 0;
    for (const hAcc of parseResult.hierarchyAccounts) {
      const acc = await BankAccount.findOne({
        $or: [
          { code: hAcc.code },
          { code: new RegExp(hAcc.code.replace(/\s+/g, ''), 'i') },
          { bankCode: hAcc.code }
        ]
      });

      if (acc) {
        acc.openingBalance = hAcc.openingBalance;
        acc.todayInflows = hAcc.todayInflows;
        acc.todayOutflows = hAcc.todayOutflows;
        acc.closingBalance = hAcc.closingBalance;
        acc.statementDate = new Date(targetDateStr);
        await acc.save();

        await saveDailyAccountSnapshot(acc, targetDateStr, 'HIERARCHY_UPLOAD');
        updatedAccountsCount++;
      }
    }

    await logCashFlowAudit(req, 'UPLOAD_HIERARCHY_STATEMENT', {
      date: targetDateStr,
      filename: originalname,
      updatedAccountsCount
    });

    return {
      success: true,
      multiAccount: true,
      filename: originalname,
      updatedCount: updatedAccountsCount,
      date: targetDateStr,
      message: `Multi-Account Hierarchy Statement imported! Updated balances for ${updatedAccountsCount} accounts.`
    };
  }

  // Single Account Matching Logic:
  const targetId = accountId || bankId;
  let account = null;
  if (targetId && targetId !== 'AUTO_DETECT') {
    account = await BankAccount.findById(targetId);
  }
  if (!account && code) {
    account = await BankAccount.findOne({ code });
  }
  if (!account && summary.matchedBranch?.code) {
    account = await BankAccount.findOne({ code: summary.matchedBranch.code });
  }
  if (!account && summary.last3Digits) {
    account = await BankAccount.findOne({
      $or: [
        { accountNumberLast3: summary.last3Digits },
        { code: new RegExp(summary.last3Digits + '$', 'i') }
      ]
    });
  }
  if (!account && bankCode && bankCode !== 'MANUAL' && bankCode !== 'HDFC') {
    account = await BankAccount.findOne({ bankCode: bankCode.toUpperCase() });
  }

  if (!account) {
    throw new Error(
      `Could not determine which bank account "${originalname}" belongs to. Detected name: "${summary.accountName || 'Unknown'}", number: "${summary.accountNumber || summary.last3Digits || 'Unknown'}". Please select the target bank account or verify filename contains branch code.`
    );
  }

  // Calculate inflows/outflows
  let totalCredit = 0;
  let totalDebit = 0;
  for (const txn of normalizedTxns) {
    if (txn.type === 'CREDIT') totalCredit += txn.amount;
    if (txn.type === 'DEBIT') totalDebit += txn.amount;
  }

  if (summary.openingBalance !== null && summary.openingBalance !== undefined) {
    account.openingBalance = summary.openingBalance;
    account.todayInflows = (summary.todayInflows !== null && summary.todayInflows !== undefined && summary.todayInflows > 0)
      ? summary.todayInflows
      : (totalCredit > 0 ? totalCredit : (summary.todayInflows || 0));

    account.todayOutflows = (summary.todayOutflows !== null && summary.todayOutflows !== undefined && summary.todayOutflows > 0)
      ? summary.todayOutflows
      : (totalDebit > 0 ? totalDebit : (summary.todayOutflows || 0));

    if (summary.closingBalance !== null && summary.closingBalance !== undefined) {
      account.closingBalance = summary.closingBalance;
    } else {
      account.closingBalance = account.openingBalance + account.todayInflows - account.todayOutflows;
    }
  } else {
    account.todayInflows = totalCredit;
    account.todayOutflows = totalDebit;
    account.closingBalance = account.openingBalance + totalCredit - totalDebit;
  }

  account.statementDate = new Date(targetDateStr);
  await account.save();

  // Daily snapshot
  await saveDailyAccountSnapshot(account, targetDateStr, 'STATEMENT_UPLOAD');

  // Insert normalized transactions deduplicated by SHA-256 rawHash
  let insertedCount = 0;
  let duplicateCount = 0;

  for (const txn of normalizedTxns) {
    txn.bankId = account._id;
    txn.bankCode = account.bankCode;
    txn.bankName = account.bankName;
    txn.maskedAccountNumber = account.maskedAccountNumber;
    txn.transactionDate = new Date(targetDateStr);

    const existing = await CashTransaction.findOne({ rawHash: txn.rawHash });
    if (existing) {
      duplicateCount++;
    } else {
      await CashTransaction.create(txn);
      insertedCount++;
    }
  }

  await logCashFlowAudit(req, 'UPLOAD_STATEMENT', {
    bankCode: account.bankCode,
    accountCode: account.code,
    filename: originalname,
    date: targetDateStr,
    openingBalance: account.openingBalance,
    todayInflows: account.todayInflows,
    todayOutflows: account.todayOutflows,
    closingBalance: account.closingBalance,
    insertedCount
  });

  return {
    success: true,
    filename: originalname,
    accountCode: account.code,
    bankName: account.bankName,
    maskedAccountNumber: account.maskedAccountNumber,
    date: targetDateStr,
    scannedSummary: summary,
    totalExtracted: normalizedTxns.length,
    insertedCount,
    duplicatesSkipped: duplicateCount,
    openingBalance: account.openingBalance,
    totalInflow: account.todayInflows,
    totalOutflow: account.todayOutflows,
    updatedClosingBalance: account.closingBalance
  };
}

export const uploadStatement = async (req, res) => {
  const files = req.files && req.files.length > 0 ? req.files : (req.file ? [req.file] : []);

  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'Please select at least one statement file to upload (.xlsx, .xls, .csv, or .pdf).' });
  }

  const {
    bankCode,
    accountId,
    bankId,
    code,
    statementDate,
    date
  } = req.body;

  const targetDateStr = statementDate || date || new Date().toISOString().split('T')[0];

  // Single-file direct flow
  if (files.length === 1) {
    const file = files[0];
    try {
      const result = await processSingleStatement({
        filePath: file.path,
        originalname: file.originalname,
        bankCode,
        accountId,
        bankId,
        code,
        targetDateStr,
        req
      });

      return res.json({
        success: true,
        message: result.message || `Statement processed successfully for [${result.accountCode || result.bankName || 'Account'}]! ${result.insertedCount || 0} transactions imported.`,
        data: result
      });
    } catch (error) {
      console.error('❌ uploadStatement error:', error);
      if (file.path && fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch (e) {}
      }
      return res.status(400).json({ error: error.message || 'Failed to process statement' });
    }
  }

  // Multi-file Batch Processing (Sequential execution for strict Render 512MB RAM safety)
  const results = [];
  const errors = [];
  let totalInserted = 0;
  let totalDuplicates = 0;

  for (const file of files) {
    try {
      const result = await processSingleStatement({
        filePath: file.path,
        originalname: file.originalname,
        bankCode,
        accountId,
        bankId,
        code,
        targetDateStr,
        req
      });
      results.push(result);
      if (result.insertedCount) totalInserted += result.insertedCount;
      if (result.duplicatesSkipped) totalDuplicates += result.duplicatesSkipped;
    } catch (err) {
      console.error(`❌ Batch upload item failed [${file.originalname}]:`, err.message);
      if (file.path && fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch (e) {}
      }
      errors.push({
        filename: file.originalname,
        error: err.message
      });
    }
  }

  const successCount = results.length;
  const failureCount = errors.length;

  if (successCount === 0) {
    return res.status(400).json({
      error: `All ${files.length} files failed to process.`,
      details: errors
    });
  }

  return res.json({
    success: true,
    message: `Processed ${successCount}/${files.length} statements successfully! ${totalInserted} total transactions imported.`,
    data: {
      isBatch: true,
      totalFiles: files.length,
      successCount,
      failureCount,
      totalInserted,
      totalDuplicates,
      results,
      errors
    }
  });
};

/**
 * 6. Daily Cash Position Report Generator
 */
export const getDailyReport = async (req, res) => {
  try {
    const reportDateStr = req.query.date || new Date().toISOString().split('T')[0];
    const targetDate = new Date(reportDateStr);
    targetDate.setHours(0, 0, 0, 0);

    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const accounts = await BankAccount.find({ isActive: true });
    const transactions = await CashTransaction.find({
      transactionDate: { $gte: targetDate, $lt: nextDate }
    });

    const totalCash = accounts.reduce((sum, a) => sum + (a.closingBalance || 0), 0);
    const totalInflows = accounts.reduce((sum, a) => sum + (a.todayInflows || 0), 0);
    const totalOutflows = accounts.reduce((sum, a) => sum + (a.todayOutflows || 0), 0);
    const netMovement = totalInflows - totalOutflows;

    // Category breakdown
    const categoryTotals = {};
    for (const t of transactions) {
      if (!categoryTotals[t.category]) {
        categoryTotals[t.category] = { credit: 0, debit: 0 };
      }
      if (t.type === 'CREDIT') categoryTotals[t.category].credit += t.amount;
      else categoryTotals[t.category].debit += t.amount;
    }

    const report = {
      reportId: `DCR-${reportDateStr.replace(/-/g, '')}`,
      reportDate: reportDateStr,
      generatedAt: new Date().toISOString(),
      generatedBy: req.user.displayName || req.user.email,
      currency: 'INR',
      summary: {
        openingCash: accounts.reduce((sum, a) => sum + (a.openingBalance || 0), 0),
        totalInflows,
        totalOutflows,
        netMovement,
        closingCash: totalCash
      },
      accountBreakdowns: accounts.map(a => ({
        bankName: a.bankName,
        bankCode: a.bankCode,
        maskedAccountNumber: a.maskedAccountNumber,
        openingBalance: a.openingBalance,
        todayInflows: a.todayInflows,
        todayOutflows: a.todayOutflows,
        closingBalance: a.closingBalance
      })),
      bankBalances: accounts.map(a => ({
        bankName: a.bankName,
        bankCode: a.bankCode,
        maskedAccountNumber: a.maskedAccountNumber,
        openingBalance: a.openingBalance,
        inflows: a.todayInflows,
        outflows: a.todayOutflows,
        closingBalance: a.closingBalance
      })),
      transactions,
      categoryBreakdown: categoryTotals,
      forecastComparison: {
        expectedInflows: 500000,
        actualInflows: totalInflows,
        varianceInflows: totalInflows - 500000,
        expectedOutflows: 400000,
        actualOutflows: totalOutflows,
        varianceOutflows: 400000 - totalOutflows,
        materialVarianceNotes: 'Daily actuals compiled from active bank ledger and verified statements.'
      }
    };

    await logCashFlowAudit(req, 'EXPORT_REPORT', { reportDate: reportDateStr });

    res.json({
      success: true,
      data: report,
      report
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * 7. Manual Transaction Entry
 */
export const createManualTransaction = async (req, res) => {
  try {
    const { bankId, bankCode, transactionDate, description, type, amount, category, reference, notes } = req.body;

    if ((!bankId && !bankCode) || !description || !amount || !type) {
      return res.status(400).json({ error: 'Bank, description, amount, and type are required' });
    }

    let account = null;
    if (bankId) {
      account = await BankAccount.findById(bankId);
    } else if (bankCode) {
      account = await BankAccount.findOne({ bankCode: bankCode.toUpperCase() });
    }

    if (!account) {
      return res.status(400).json({ error: 'Bank account not found' });
    }

    const parsedAmount = Number(amount);
    const txnDate = transactionDate ? new Date(transactionDate) : new Date();

    const newTxn = await CashTransaction.create({
      companyId: 'default_corp',
      bankId: account._id,
      bankName: account.bankName,
      bankCode: account.bankCode,
      maskedAccountNumber: account.maskedAccountNumber,
      transactionDate: txnDate,
      valueDate: txnDate,
      description: description.trim(),
      type: type.toUpperCase(),
      amount: parsedAmount,
      category: category || (type === 'CREDIT' ? 'Customer Receipts' : 'Vendor Payments'),
      reference: reference?.trim() || `MANUAL-${Date.now()}`,
      source: 'MANUAL_ENTRY',
      notes: notes || '',
      isReconciled: true,
      rawHash: `MANUAL-${Date.now()}-${Math.random()}`
    });

    if (type === 'CREDIT') {
      account.todayInflows = (account.todayInflows || 0) + parsedAmount;
    } else {
      account.todayOutflows = (account.todayOutflows || 0) + parsedAmount;
    }
    account.closingBalance = account.openingBalance + account.todayInflows - account.todayOutflows;
    await account.save();

    await logCashFlowAudit(req, 'MANUAL_TRANSACTION_CREATE', { id: newTxn._id, amount: parsedAmount, type });

    res.status(201).json({
      success: true,
      data: newTxn,
      transaction: newTxn
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * 7b. Delete Transaction & Auto-Reconcile Balance
 */
export const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const tx = await CashTransaction.findById(id);
    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Find bank account to reverse balance impact
    const account = await BankAccount.findById(tx.bankId);
    if (account) {
      if (tx.type === 'CREDIT') {
        account.todayInflows = Math.max(0, (account.todayInflows || 0) - tx.amount);
      } else if (tx.type === 'DEBIT') {
        account.todayOutflows = Math.max(0, (account.todayOutflows || 0) - tx.amount);
      }
      account.closingBalance = account.openingBalance + (account.todayInflows || 0) - (account.todayOutflows || 0);
      await account.save();

      // Update DailyBalanceSnapshot if one exists for the transaction date
      if (tx.transactionDate) {
        const txDateStr = tx.transactionDate.toISOString().split('T')[0];
        await saveDailyAccountSnapshot(account, txDateStr, 'TRANSACTION_DELETE');
      }
    }

    await CashTransaction.findByIdAndDelete(id);

    await logCashFlowAudit(req, 'DELETE_TRANSACTION', {
      transactionId: id,
      amount: tx.amount,
      type: tx.type,
      description: tx.description,
      bankCode: tx.bankCode
    });

    res.json({
      success: true,
      message: 'Transaction deleted successfully and balance recalculated.',
      deletedId: id
    });
  } catch (error) {
    console.error('deleteTransaction error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete transaction' });
  }
};

/**
 * 7c. Update Transaction & Recalculate Balance
 */
export const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, amount, type, category, reference, transactionDate, notes } = req.body;

    const tx = await CashTransaction.findById(id);
    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const oldAmount = tx.amount;
    const oldType = tx.type;
    const newAmount = amount !== undefined ? Number(amount) : oldAmount;
    const newType = type ? type.toUpperCase() : oldType;

    // Find bank account to adjust net difference
    const account = await BankAccount.findById(tx.bankId);
    if (account) {
      // 1. Revert old impact
      if (oldType === 'CREDIT') {
        account.todayInflows = Math.max(0, (account.todayInflows || 0) - oldAmount);
      } else if (oldType === 'DEBIT') {
        account.todayOutflows = Math.max(0, (account.todayOutflows || 0) - oldAmount);
      }

      // 2. Apply new impact
      if (newType === 'CREDIT') {
        account.todayInflows = (account.todayInflows || 0) + newAmount;
      } else if (newType === 'DEBIT') {
        account.todayOutflows = (account.todayOutflows || 0) + newAmount;
      }

      account.closingBalance = account.openingBalance + (account.todayInflows || 0) - (account.todayOutflows || 0);
      await account.save();

      // Update snapshot if applicable
      const targetDateStr = transactionDate || (tx.transactionDate ? tx.transactionDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      await saveDailyAccountSnapshot(account, targetDateStr, 'TRANSACTION_EDIT');
    }

    if (description !== undefined) tx.description = description.trim();
    if (amount !== undefined) tx.amount = newAmount;
    if (type !== undefined) tx.type = newType;
    if (category !== undefined) tx.category = category;
    if (reference !== undefined) tx.reference = reference.trim();
    if (notes !== undefined) tx.notes = notes;
    if (transactionDate) tx.transactionDate = new Date(transactionDate);

    await tx.save();

    await logCashFlowAudit(req, 'UPDATE_TRANSACTION', {
      transactionId: id,
      newAmount,
      newType,
      description: tx.description
    });

    res.json({
      success: true,
      message: 'Transaction updated successfully and balance recalculated.',
      data: tx
    });
  } catch (error) {
    console.error('updateTransaction error:', error);
    res.status(500).json({ error: error.message || 'Failed to update transaction' });
  }
};

/**
 * Reset All Cash Flow Data to Zero
 */
export const resetCashFlowData = async (req, res) => {
  try {
    // 1. Reset all bank account balances to zero
    await BankAccount.updateMany({}, {
      $set: {
        openingBalance: 0,
        todayInflows: 0,
        todayOutflows: 0,
        closingBalance: 0
      }
    });

    // 2. Delete all transaction records
    await CashTransaction.deleteMany({});

    // 3. Delete all daily balance snapshots
    await DailyBalanceSnapshot.deleteMany({});

    // 4. Delete all forecasts
    await CashForecast.deleteMany({});

    await logCashFlowAudit(req, 'RESET_CASHFLOW_DATABASE', {
      timestamp: new Date().toISOString(),
      reason: 'User requested clean zero reset'
    });

    res.json({
      success: true,
      message: 'All cashflow data successfully reset to 0. All transactions and balance snapshots cleared.'
    });
  } catch (error) {
    console.error('resetCashFlowData error:', error);
    res.status(500).json({ error: error.message || 'Failed to reset cashflow database' });
  }
};

/**
 * 8. Hierarchical Multi-Bank Report
 * Returns structured hierarchy matching the user's dashboard & excel layout
 */
export const getHierarchyReport = async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0] } = req.query;
    const accounts = await getAccountBalancesForDate(date);

    const capexMaster = accounts.find(a => a.division === 'Capex' && a.tier === 'Master') || {
      bankName: 'Corporate Capex (Master)',
      code: 'CAPEX_MASTER',
      openingBalance: 0,
      todayInflows: 0,
      todayOutflows: 0,
      closingBalance: 0
    };

    const capexBranches = accounts.filter(a => a.division === 'Capex' && a.tier === 'City Branch');
    const capexCityOpening = capexBranches.reduce((s, a) => s + (a.openingBalance || 0), 0);
    const capexCityInflow = capexBranches.reduce((s, a) => s + (a.todayInflows || 0), 0);
    const capexCityOutflow = capexBranches.reduce((s, a) => s + (a.todayOutflows || 0), 0);
    const capexCityClosing = capexBranches.reduce((s, a) => s + (a.closingBalance || 0), 0);

    const capexCityLevel = {
      name: 'City Level',
      openingBalance: capexCityOpening,
      todayInflows: capexCityInflow,
      todayOutflows: capexCityOutflow,
      closingBalance: capexCityClosing,
      branches: capexBranches
    };

    const capexTotal = {
      name: 'Capex Total',
      openingBalance: (capexMaster.openingBalance || 0) + capexCityOpening,
      todayInflows: (capexMaster.todayInflows || 0) + capexCityInflow,
      todayOutflows: (capexMaster.todayOutflows || 0) + capexCityOutflow,
      closingBalance: (capexMaster.closingBalance || 0) + capexCityClosing
    };

    const opexMaster = accounts.find(a => a.division === 'Opex' && a.tier === 'Master') || {
      bankName: 'Corporate Opex (Master)',
      code: 'OPEX_MASTER',
      openingBalance: 0,
      todayInflows: 0,
      todayOutflows: 0,
      closingBalance: 0
    };

    const opexBranches = accounts.filter(a => a.division === 'Opex' && a.tier === 'City Branch');
    const opexCityOpening = opexBranches.reduce((s, a) => s + (a.openingBalance || 0), 0);
    const opexCityInflow = opexBranches.reduce((s, a) => s + (a.todayInflows || 0), 0);
    const opexCityOutflow = opexBranches.reduce((s, a) => s + (a.todayOutflows || 0), 0);
    const opexCityClosing = opexBranches.reduce((s, a) => s + (a.closingBalance || 0), 0);

    const opexCityLevel = {
      name: 'City Level',
      openingBalance: opexCityOpening,
      todayInflows: opexCityInflow,
      todayOutflows: opexCityOutflow,
      closingBalance: opexCityClosing,
      branches: opexBranches
    };

    const opexTotal = {
      name: 'Opex Total',
      openingBalance: (opexMaster.openingBalance || 0) + opexCityOpening,
      todayInflows: (opexMaster.todayInflows || 0) + opexCityInflow,
      todayOutflows: (opexMaster.todayOutflows || 0) + opexCityOutflow,
      closingBalance: (opexMaster.closingBalance || 0) + opexCityClosing
    };

    const ccAccount = accounts.find(a => a.division === 'CC A/c Usage' || a.tier === 'Credit') || {
      bankName: 'Corporate Credit Line / CC',
      code: 'CC A/c Usage',
      openingBalance: 0,
      todayInflows: 0,
      todayOutflows: 0,
      closingBalance: 0
    };

    const investmentsAccount = accounts.find(a => a.division === 'Investments' || a.tier === 'Investment') || {
      bankName: 'Treasury Liquid Funds & FDs',
      code: 'Investments',
      openingBalance: 0,
      todayInflows: 0,
      todayOutflows: 0,
      closingBalance: 0
    };

    // Operating Total = Capex Total + Opex Total + CC A/c Usage
    const operatingTotal = {
      name: 'TOTAL',
      openingBalance: capexTotal.openingBalance + opexTotal.openingBalance + (ccAccount.openingBalance || 0),
      todayInflows: capexTotal.todayInflows + opexTotal.todayInflows + (ccAccount.todayInflows || 0),
      todayOutflows: capexTotal.todayOutflows + opexTotal.todayOutflows + (ccAccount.todayOutflows || 0),
      closingBalance: capexTotal.closingBalance + opexTotal.closingBalance + (ccAccount.closingBalance || 0)
    };

    const grandTotal = {
      name: 'GRAND TOTAL (With Investments)',
      openingBalance: operatingTotal.openingBalance + (investmentsAccount.openingBalance || 0),
      todayInflows: operatingTotal.todayInflows + (investmentsAccount.todayInflows || 0),
      todayOutflows: operatingTotal.todayOutflows + (investmentsAccount.todayOutflows || 0),
      closingBalance: operatingTotal.closingBalance + (investmentsAccount.closingBalance || 0)
    };

    res.json({
      success: true,
      data: {
        date,
        operatingTotal,
        capex: {
          master: capexMaster,
          cityLevel: capexCityLevel,
          total: capexTotal
        },
        opex: {
          master: opexMaster,
          cityLevel: opexCityLevel,
          total: opexTotal
        },
        ccAccount,
        investmentsAccount,
        grandTotal,
        rawAccounts: accounts
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * 9. Quick Balance Update for any account (Day-Aware)
 */
export const updateAccountBalance = async (req, res) => {
  try {
    const { id, code, openingBalance, todayInflows, todayOutflows, closingBalance, date } = req.body;
    const targetDateStr = date || new Date().toISOString().split('T')[0];

    let account = null;
    if (id) {
      account = await BankAccount.findById(id);
    } else if (code) {
      account = await BankAccount.findOne({ code });
    }

    if (!account) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    if (openingBalance !== undefined) account.openingBalance = Number(openingBalance);
    if (todayInflows !== undefined) account.todayInflows = Number(todayInflows);
    if (todayOutflows !== undefined) account.todayOutflows = Number(todayOutflows);
    if (closingBalance !== undefined) {
      account.closingBalance = Number(closingBalance);
    } else {
      account.closingBalance = account.openingBalance + account.todayInflows - account.todayOutflows;
    }

    account.statementDate = new Date(targetDateStr);
    await account.save();

    // Persist snapshot for this date
    await saveDailyAccountSnapshot(account, targetDateStr, 'MANUAL_EDIT');

    await logCashFlowAudit(req, 'UPDATE_ACCOUNT_BALANCE', {
      code: account.code,
      date: targetDateStr,
      closingBalance: account.closingBalance
    });

    res.json({
      success: true,
      message: `Account ${account.code || account.bankName} updated successfully for ${targetDateStr}`,
      data: account
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * 10. Export Hierarchical Excel file matching exact user layout with colors and styles (Day-Aware)
 */
export const exportHierarchyExcel = async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0], division = 'ALL' } = req.query;
    const accounts = await getAccountBalancesForDate(date);

    const capexMaster = accounts.find(a => a.division === 'Capex' && a.tier === 'Master');
    const capexBranches = accounts.filter(a => a.division === 'Capex' && a.tier === 'City Branch');
    const capexCityOpening = capexBranches.reduce((s, a) => s + (a.openingBalance || 0), 0);
    const capexCityInflow = capexBranches.reduce((s, a) => s + (a.todayInflows || 0), 0);
    const capexCityOutflow = capexBranches.reduce((s, a) => s + (a.todayOutflows || 0), 0);
    const capexCityClosing = capexBranches.reduce((s, a) => s + (a.closingBalance || 0), 0);

    const capexTotal = {
      opening: (capexMaster?.openingBalance || 0) + capexCityOpening,
      inflow: (capexMaster?.todayInflows || 0) + capexCityInflow,
      outflow: (capexMaster?.todayOutflows || 0) + capexCityOutflow,
      closing: (capexMaster?.closingBalance || 0) + capexCityClosing
    };

    const opexMaster = accounts.find(a => a.division === 'Opex' && a.tier === 'Master');
    const opexBranches = accounts.filter(a => a.division === 'Opex' && a.tier === 'City Branch');
    const opexCityOpening = opexBranches.reduce((s, a) => s + (a.openingBalance || 0), 0);
    const opexCityInflow = opexBranches.reduce((s, a) => s + (a.todayInflows || 0), 0);
    const opexCityOutflow = opexBranches.reduce((s, a) => s + (a.todayOutflows || 0), 0);
    const opexCityClosing = opexBranches.reduce((s, a) => s + (a.closingBalance || 0), 0);

    const opexTotal = {
      opening: (opexMaster?.openingBalance || 0) + opexCityOpening,
      inflow: (opexMaster?.todayInflows || 0) + opexCityInflow,
      outflow: (opexMaster?.todayOutflows || 0) + opexCityOutflow,
      closing: (opexMaster?.closingBalance || 0) + opexCityClosing
    };

    const ccAccount = accounts.find(a => a.division === 'CC A/c Usage' || a.tier === 'Credit');
    const investmentsAccount = accounts.find(a => a.division === 'Investments' || a.tier === 'Investment');

    const totalOpening = capexTotal.opening + opexTotal.opening + (ccAccount?.openingBalance || 0);
    const totalInflow = capexTotal.inflow + opexTotal.inflow + (ccAccount?.todayInflows || 0);
    const totalOutflow = capexTotal.outflow + opexTotal.outflow + (ccAccount?.todayOutflows || 0);
    const totalClosing = capexTotal.closing + opexTotal.closing + (ccAccount?.closingBalance || 0);

    // Format date as "11 Sep 26"
    const parsedDate = new Date(date);
    const dateFormatted = !isNaN(parsedDate.getTime())
      ? `${parsedDate.getDate()} ${parsedDate.toLocaleString('en-US', { month: 'short' })} ${String(parsedDate.getFullYear()).slice(-2)}`
      : date;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Danzo Treasury System';
    workbook.lastModifiedBy = req.user?.email || 'Admin';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Bank Balance', {
      views: [{ showGridLines: true }]
    });

    // Column definitions
    sheet.columns = [
      { key: 'colA', width: 26 },
      { key: 'colB', width: 20 },
      { key: 'colC', width: 16 },
      { key: 'colD', width: 16 },
      { key: 'colE', width: 20 }
    ];

    const thinBorder = {
      top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
    };

    const applyRowBorders = (row) => {
      for (let c = 1; c <= 5; c++) {
        row.getCell(c).border = thinBorder;
      }
    };

    // 1. Title Banner (Row 1)
    const titleRow = sheet.addRow([`BANK BALANCE AS ON ${dateFormatted}`, '', '', '', '']);
    sheet.mergeCells('A1:E1');
    titleRow.height = 24;
    titleRow.getCell(1).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF000000' } };
    titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
    applyRowBorders(titleRow);

    // 2. Column Headers (Row 2)
    const headerRow = sheet.addRow(['', 'Opening Balance', 'Inflow', 'Outflow', 'Closing Balance']);
    headerRow.height = 22;
    for (let c = 1; c <= 5; c++) {
      const cell = headerRow.getCell(c);
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF000000' } };
      cell.alignment = { vertical: 'middle', horizontal: c === 1 ? 'left' : 'right' };
      cell.border = thinBorder;
    }

    const addDataRow = (label, b, c, d, e, options = {}) => {
      const row = sheet.addRow([label, b, c, d, e]);
      row.height = options.height || 20;

      // Fill background
      if (options.bg) {
        for (let colIdx = 1; colIdx <= 5; colIdx++) {
          row.getCell(colIdx).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: options.bg }
          };
        }
      }

      // Font & Alignment
      for (let colIdx = 1; colIdx <= 5; colIdx++) {
        const cell = row.getCell(colIdx);
        cell.border = thinBorder;
        cell.font = {
          name: 'Arial',
          size: 10,
          bold: Boolean(options.bold || (colIdx === 2 && options.boldOpening) || (colIdx > 2 && options.boldOthers)),
          color: { argb: options.color || 'FF000000' }
        };

        if (colIdx === 1) {
          cell.alignment = { vertical: 'middle', horizontal: 'left', indent: options.indent || 0 };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
          if (typeof cell.value === 'number') {
            cell.numFmt = '#,##0';
          }
        }
      }
      return row;
    };

    // 3. TOTAL ROW (Blue Header: FF4A86E8)
    if (division === 'ALL' || division === 'TOTAL') {
      addDataRow('TOTAL', totalOpening, totalInflow, totalOutflow, totalClosing, {
        bg: 'FF4A86E8', // Cornflower Blue
        color: 'FFFFFFFF', // White text
        bold: true,
        height: 22
      });
    }

    // 4. CAPEX DIVISION (Green Header: FF70AD47)
    if (division === 'ALL' || division === 'Capex') {
      // Capex Header
      addDataRow('Capex', capexTotal.opening, capexTotal.inflow, capexTotal.outflow, capexTotal.closing, {
        bg: 'FF70AD47', // Medium Green
        color: 'FFFFFFFF',
        bold: true,
        height: 22
      });

      // - Master
      addDataRow('-  Master', capexMaster?.openingBalance || 0, capexMaster?.todayInflows || 0, capexMaster?.todayOutflows || 0, capexMaster?.closingBalance || 0, {
        indent: 1
      });

      // - City Level
      addDataRow('-  City Level', capexCityOpening, capexCityInflow, capexCityOutflow, capexCityClosing, {
        indent: 1
      });

      // Capex Branches
      for (const branch of capexBranches) {
        addDataRow(branch.code || branch.bankName, branch.openingBalance, branch.todayInflows, branch.todayOutflows, branch.closingBalance, {
          indent: 0,
          boldOpening: true
        });
      }
    }

    // 5. OPEX DIVISION (Coral Red Header: FFE06666)
    if (division === 'ALL' || division === 'Opex') {
      // Opex Header
      addDataRow('Opex', opexTotal.opening, opexTotal.inflow, opexTotal.outflow, opexTotal.closing, {
        bg: 'FFE06666', // Coral Red
        color: 'FFFFFFFF',
        bold: true,
        height: 22
      });

      // - Master
      addDataRow('-  Master', opexMaster?.openingBalance || 0, opexMaster?.todayInflows || 0, opexMaster?.todayOutflows || 0, opexMaster?.closingBalance || 0, {
        indent: 1
      });

      // - City Level
      addDataRow('-  City Level', opexCityOpening, opexCityInflow, opexCityOutflow, opexCityClosing, {
        indent: 1
      });

      // Opex Branches
      for (const branch of opexBranches) {
        addDataRow(branch.code || branch.bankName, branch.openingBalance, branch.todayInflows, branch.todayOutflows, branch.closingBalance, {
          indent: 0,
          boldOpening: true
        });
      }
    }

    // 6. CC A/C USAGE (Vibrant Neon Green: FF00FF00, Text: Red FFCC0000)
    if ((division === 'ALL' || division === 'CC A/c Usage') && ccAccount) {
      addDataRow('CC A/c Usage', ccAccount.openingBalance, ccAccount.todayInflows, ccAccount.todayOutflows, ccAccount.closingBalance, {
        bg: 'FF00FF00', // Vibrant Neon Green
        color: 'FFCC0000', // Red text matching screenshot
        bold: true,
        height: 22
      });
    }

    // 7. INVESTMENTS (Purple / Magenta: FFA64D79)
    if ((division === 'ALL' || division === 'Investments') && investmentsAccount) {
      addDataRow('Investments', investmentsAccount.openingBalance, investmentsAccount.todayInflows, investmentsAccount.todayOutflows, investmentsAccount.closingBalance, {
        bg: 'FFA64D79', // Plum / Magenta
        color: 'FFFFFFFF',
        bold: true,
        height: 22
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Disposition', `attachment; filename="Bank_Balance_${date}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('❌ exportHierarchyExcel error:', error);
    res.status(500).json({ error: error.message });
  }
};
