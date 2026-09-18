import BankDataSource from './BankDataSource.js';
import * as xlsx from 'xlsx';
import crypto from 'crypto';

/**
 * ManualUploadSource
 * Bulletproof corporate bank statement parser with multi-cell matrix scanning,
 * account identification (last 3 digits & branch keywords), and zero-disk retention.
 */
export default class ManualUploadSource extends BankDataSource {
  constructor() {
    super({ name: 'ManualUploadSource', bankCode: 'MANUAL' });
  }

  /**
   * Helper to parse numbers in various formats (e.g. 15,20,801.00, INR 1,520,801.00, (5,000), -5000, Withdrawls: 50,000, etc.)
   */
  parseCurrencyNumber(val) {
    if (val === undefined || val === null || val === '') return null;
    if (typeof val === 'number') return isNaN(val) ? null : val;
    let str = String(val).trim();
    if (!str) return null;

    const isNegative = (str.startsWith('(') && str.endsWith(')')) || str.startsWith('-') || str.includes('(DR)') || str.includes(' DR');
    // Remove words, currencies, and special characters
    str = str.replace(/(?:INR|Rs\.?|₹|CR|DR|Debits?|Credits?|Withdrawals?|Withdrawls?|Deposits?|Balance|Opening|Closing|Total|Outflows?|Inflows?|[:\-=])/gi, ' ').trim();
    str = str.replace(/[(),]/g, '').trim();
    
    // Find numeric pattern
    const match = str.match(/[-+]?[\d,]+\.?\d*/);
    if (!match) return null;
    const cleanStr = match[0].replace(/,/g, '');
    const num = parseFloat(cleanStr);
    if (isNaN(num)) return null;
    return isNegative ? -Math.abs(num) : num;
  }

  /**
   * Match known bank accounts by branch keyword and division
   */
  matchBranchFromText(text) {
    if (!text) return null;
    const clean = String(text).toUpperCase();

    // 1. Direct last-3 digits pattern match in text (e.g., 721205000565 -> 565)
    const knownDigits = [
      { digits: '606', code: 'CAPEX_MASTER', division: 'Capex' },
      { digits: '603', code: 'HYD603', division: 'Capex' },
      { digits: '611', code: 'BNG611', division: 'Capex' },
      { digits: '602', code: 'MUM602', division: 'Capex' },
      { digits: '612', code: 'PUN612', division: 'Capex' },
      { digits: '565', code: 'VIJ 565', division: 'Capex' },
      { digits: '653', code: 'NCR653', division: 'Capex' },
      { digits: '609', code: 'OPEX_MASTER', division: 'Opex' },
      { digits: '605', code: 'HYD605', division: 'Opex' },
      { digits: '355', code: 'BNG355', division: 'Opex' },
      { digits: '607', code: 'MUM607', division: 'Opex' },
      { digits: '611', code: 'PUN611', division: 'Opex' },
      { digits: '567', code: 'VIJ 567', division: 'Opex' },
      { digits: '651', code: 'NCR651', division: 'Opex' },
      { digits: '860', code: 'CC A/c Usage', division: 'CC A/c Usage' },
      { digits: '900', code: 'Investments', division: 'Investments' }
    ];

    // Check if any known 3-digit suffix or account number exists in the string
    const numbersFound = clean.match(/\d{3,18}/g) || [];
    for (const numStr of numbersFound) {
      const suffix = numStr.slice(-3);
      // Disambiguate 611 between BNG (Capex) and PUN (Opex) if division present
      if (suffix === '611') {
        if (clean.includes('PUN') || clean.includes('PUNE') || clean.includes('OPEX')) {
          return { digits: '611', code: 'PUN611', division: 'Opex' };
        }
        return { digits: '611', code: 'BNG611', division: 'Capex' };
      }
      const match = knownDigits.find(k => k.digits === suffix);
      if (match) return match;
    }

    // 2. Keyword fallback (City + Division)
    if (clean.includes('VIJAYAWADA') || clean.includes('VIJ')) {
      if (clean.includes('OPEX') || clean.includes('OPERATING')) return { digits: '567', code: 'VIJ 567', division: 'Opex' };
      return { digits: '565', code: 'VIJ 565', division: 'Capex' };
    }
    if (clean.includes('MUMBAI') || clean.includes('MUM')) {
      if (clean.includes('OPEX') || clean.includes('OPERATING')) return { digits: '607', code: 'MUM607', division: 'Opex' };
      return { digits: '602', code: 'MUM602', division: 'Capex' };
    }
    if (clean.includes('HYDERABAD') || clean.includes('HYD')) {
      if (clean.includes('OPEX') || clean.includes('OPERATING')) return { digits: '605', code: 'HYD605', division: 'Opex' };
      return { digits: '603', code: 'HYD603', division: 'Capex' };
    }
    if (clean.includes('PUNE') || clean.includes('PUN')) {
      if (clean.includes('OPEX') || clean.includes('OPERATING')) return { digits: '611', code: 'PUN611', division: 'Opex' };
      return { digits: '612', code: 'PUN612', division: 'Capex' };
    }
    if (clean.includes('BLR') || clean.includes('BANGALORE') || clean.includes('BENGALURU')) {
      if (clean.includes('OPEX') || clean.includes('OPERATING')) return { digits: '355', code: 'BNG355', division: 'Opex' };
      return { digits: '611', code: 'BNG611', division: 'Capex' };
    }
    if (clean.includes('NCR') || clean.includes('DELHI') || clean.includes('NOIDA') || clean.includes('GURGAON')) {
      if (clean.includes('OPEX') || clean.includes('OPERATING')) return { digits: '651', code: 'NCR651', division: 'Opex' };
      return { digits: '653', code: 'NCR653', division: 'Capex' };
    }
    if (clean.includes('CORPORATE') || clean.includes('CORP') || clean.includes('MASTER')) {
      if (clean.includes('OPEX') || clean.includes('OPERATING')) return { digits: '609', code: 'OPEX_MASTER', division: 'Opex' };
      return { digits: '606', code: 'CAPEX_MASTER', division: 'Capex' };
    }
    if (clean.includes('CREDIT') || clean.includes('CC A/C') || clean.includes('OVERDRAFT')) {
      return { digits: '860', code: 'CC A/c Usage', division: 'CC A/c Usage' };
    }
    if (clean.includes('INVESTMENT') || clean.includes('TREASURY') || clean.includes('FIXED DEPOSIT') || clean.includes('MUTUAL')) {
      return { digits: '900', code: 'Investments', division: 'Investments' };
    }

    return null;
  }

  /**
   * Parse and normalize file buffer based on extension
   */
  async normalizeTransactions(fileBuffer, metadata = {}) {
    const filename = (metadata.originalname || '').toLowerCase();
    let rawRows = [];
    let summary = {};
    let hierarchyAccounts = null;

    if (filename.endsWith('.xlsx') || filename.endsWith('.xls') || filename.endsWith('.csv')) {
      const parsed = this.parseExcelOrCsv(fileBuffer);
      summary = parsed.summary || {};
      rawRows = parsed.rows || [];
      hierarchyAccounts = parsed.hierarchyAccounts || null;
    } else if (filename.endsWith('.pdf')) {
      const parsed = this.parsePdfStatement(fileBuffer, metadata);
      summary = parsed.summary || {};
      rawRows = parsed.rows || [];
    } else {
      throw new Error('Unsupported file format. Please upload Excel (.xlsx/.xls), CSV (.csv), or PDF (.pdf).');
    }

    // Transform into standard Danzo transactions
    const normalized = [];
    const bankCode = metadata.bankCode || 'HDFC';
    const bankName = metadata.bankName || `${bankCode} Bank`;
    const maskedAccountNumber = metadata.maskedAccountNumber || (summary.last3Digits ? `****${summary.last3Digits}` : '****');
    const bankId = metadata.bankId;

    if (Array.isArray(rawRows) && rawRows.length > 0) {
      for (const row of rawRows) {
        const parsed = this.mapRowToStandardTransaction(row, {
          bankCode,
          bankName,
          bankId,
          maskedAccountNumber,
          defaultDate: metadata.statementDate || new Date()
        });

        if (parsed) {
          normalized.push(parsed);
        }
      }
    }

    return {
      summary,
      transactions: normalized,
      hierarchyAccounts
    };
  }

  /**
   * Parse Multi-Account Hierarchy sheet (e.g. Bank_Balance_YYYY-MM-DD.xlsx)
   */
  parseHierarchySheet(matrix) {
    if (!Array.isArray(matrix) || matrix.length < 3) return null;

    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(matrix.length, 5); r++) {
      const rowStr = (matrix[r] || []).join(' ').toLowerCase();
      if (rowStr.includes('opening') && rowStr.includes('inflow') && rowStr.includes('outflow')) {
        headerRowIdx = r;
        break;
      }
    }

    if (headerRowIdx === -1) return null;

    const accountsFound = [];
    let currentDivision = 'Capex';

    for (let r = headerRowIdx + 1; r < matrix.length; r++) {
      const row = matrix[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      const label = String(row[0] || '').trim();
      const labelUpper = label.toUpperCase();
      if (!label || labelUpper === 'TOTAL' || labelUpper.startsWith('TOTAL') || labelUpper.startsWith('GRAND TOTAL')) continue;

      if (labelUpper === 'CAPEX') {
        currentDivision = 'Capex';
        continue;
      }
      if (labelUpper === 'OPEX') {
        currentDivision = 'Opex';
        continue;
      }
      if (labelUpper.includes('CITY LEVEL')) {
        continue;
      }

      let code = null;
      if (labelUpper.includes('MASTER')) {
        code = currentDivision === 'Capex' ? 'CAPEX_MASTER' : 'OPEX_MASTER';
      } else if (labelUpper.includes('CC A/C') || labelUpper.includes('CREDIT') || labelUpper.includes('USAGE')) {
        code = 'CC A/c Usage';
      } else if (labelUpper.includes('INVESTMENT') || labelUpper.includes('TREASURY')) {
        code = 'Investments';
      } else {
        const branchMatch = this.matchBranchFromText(label);
        if (branchMatch?.code) {
          code = branchMatch.code;
        } else {
          const digits = label.match(/\d{3}/);
          if (digits) {
            const b = this.matchBranchFromText(digits[0]);
            if (b?.code) code = b.code;
          }
        }
      }

      if (code) {
        const op = this.parseCurrencyNumber(row[1]) || 0;
        const inFl = this.parseCurrencyNumber(row[2]) || 0;
        const outFl = this.parseCurrencyNumber(row[3]) || 0;
        const cl = this.parseCurrencyNumber(row[4]) !== null ? this.parseCurrencyNumber(row[4]) : (op + inFl - outFl);

        accountsFound.push({
          code,
          label,
          openingBalance: op,
          todayInflows: inFl,
          todayOutflows: outFl,
          closingBalance: cl
        });
      }
    }

    return accountsFound.length >= 2 ? accountsFound : null;
  }

  /**
   * Parse Excel or CSV workbook and extract metadata summary and transaction rows
   */
  parseExcelOrCsv(buffer) {
    const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
    let combinedSummary = null;
    let combinedRows = [];
    let hierarchyAccounts = null;

    // Scan all sheets in the workbook
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      const matrix = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      // 1. Check if this is a Multi-Account Hierarchy sheet
      const hier = this.parseHierarchySheet(matrix);
      if (hier && hier.length > 0) {
        hierarchyAccounts = hier;
      }

      // 2. Extract Single Account summary scan
      const summary = this.extractCellScanSummary(matrix);
      if (summary.openingBalance !== null || summary.last3Digits || summary.accountName) {
        combinedSummary = summary;
      }

      // 3. Try finding transaction table headers
      const tableRows = this.extractTableRows(matrix);
      if (tableRows.length > 0) {
        combinedRows.push(...tableRows);
      }
    }

    return {
      summary: combinedSummary || this.extractCellScanSummary([]),
      rows: combinedRows,
      hierarchyAccounts
    };
  }

  /**
   * Scan 2D cell matrix for Account Name, Account No,
   * Opening Bal: (same-row Col B), Withdrawls: (same-row Col B), Deposits: (same-row Col B), and Closing Bal: (same-row Col B).
   */
  extractCellScanSummary(matrix) {
    let accountName = '';
    let accountNumber = '';
    let openingBalance = null;
    let todayInflows = null;
    let todayOutflows = null;
    let closingBalance = null;

    if (!Array.isArray(matrix) || matrix.length === 0) {
      return {
        accountName: '',
        last3Digits: '',
        maskedAccountNumber: '****',
        openingBalance: null,
        todayInflows: 0,
        todayOutflows: 0,
        closingBalance: null,
        matchedBranch: null
      };
    }

    // Scan matrix row by row: match label in Col A / Cell C and strictly take value from same row (Col B / Cell C+1)
    for (let r = 0; r < matrix.length; r++) {
      const row = matrix[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      const firstCell = String(row[0] || '').trim().toUpperCase();
      if (firstCell === 'TOTAL' || firstCell.startsWith('GRAND TOTAL')) {
        continue; // Skip aggregate summary totals
      }

      for (let c = 0; c < row.length; c++) {
        const rawCell = String(row[c] || '').trim();
        const cell = rawCell.toLowerCase();
        if (!cell) continue;

        // Strictly fetch numeric value from the SAME row (next cell or inline)
        const getSameRowValue = () => {
          // 1. Direct next cell in same row (e.g. Col A is label, Col B is value)
          if (row[c + 1] !== undefined && row[c + 1] !== '') {
            const v = this.parseCurrencyNumber(row[c + 1]);
            if (v !== null) return v;
          }
          // 2. Cell c+2 if empty spacer column exists
          if (row[c + 2] !== undefined && row[c + 2] !== '') {
            const v = this.parseCurrencyNumber(row[c + 2]);
            if (v !== null) return v;
          }
          // 3. Or inline in the same cell (e.g. "Deposits: 53,40,924.00")
          const inlineV = this.parseCurrencyNumber(rawCell);
          if (inlineV !== null) return inlineV;

          return null;
        };

        // 1. Opening Bal: -> Same Row Col B
        if (openingBalance === null && (
          cell.includes('opening bal') ||
          cell.includes('opening balance') ||
          cell.includes('op bal') ||
          cell.includes('open bal') ||
          cell.includes('op. bal')
        )) {
          const val = getSameRowValue();
          if (val !== null) openingBalance = val;
        }

        // 2. Withdrawls: -> Same Row Col B (Outflow)
        if (todayOutflows === null && (
          cell.includes('withdrawls') ||
          cell.includes('withdrawals') ||
          cell.includes('withdrawal') ||
          cell.includes('withdrw') ||
          cell.includes('total debits') ||
          cell.includes('debits:') ||
          cell.includes('outflow')
        )) {
          const val = getSameRowValue();
          if (val !== null) todayOutflows = Math.abs(val);
        }

        // 3. Deposits: -> Same Row Col B (Inflow)
        if (todayInflows === null && (
          cell.includes('deposits') ||
          cell.includes('deposit') ||
          cell.includes('total credits') ||
          cell.includes('credits:') ||
          cell.includes('inflow')
        )) {
          const val = getSameRowValue();
          if (val !== null) todayInflows = Math.abs(val);
        }

        // 4. Closing Bal: -> Same Row Col B
        if (closingBalance === null && (
          cell.includes('closing bal') ||
          cell.includes('closing balance') ||
          cell.includes('close bal') ||
          cell.includes('cl. bal') ||
          cell.includes('available bal')
        )) {
          const val = getSameRowValue();
          if (val !== null) closingBalance = val;
        }

        // Account Name detection
        if (!accountName && (cell.includes('account name') || cell.includes('a/c name') || cell.includes('customer name') || cell.includes('company name') || cell.includes('harleys india'))) {
          if (cell.includes('harleys india')) {
            accountName = rawCell;
          } else if (row[c + 1] && isNaN(Number(String(row[c + 1]).replace(/,/g, '')))) {
            accountName = String(row[c + 1]).trim();
          }
        }

        // Account Number detection (continuous string of 6-18 digits)
        if (!accountNumber) {
          const numMatch = rawCell.match(/\d{6,18}/);
          if (numMatch) {
            accountNumber = numMatch[0];
          } else if (cell.includes('account no') || cell.includes('account number') || cell.includes('a/c no')) {
            const rowStr = row.slice(c + 1).join(' ');
            const m = rowStr.match(/\d{6,18}/) || rowStr.match(/\d{3,18}/);
            if (m) accountNumber = m[0];
          }
        }
      }
    }

    // Branch match
    const fullTextSearch = `${accountName} ${accountNumber} ${matrix.slice(0, 10).map(r => r.join(' ')).join(' ')}`;
    const matchedBranch = this.matchBranchFromText(fullTextSearch);

    let last3Digits = matchedBranch?.digits || (accountNumber && accountNumber.length >= 3 ? accountNumber.slice(-3) : '');
    const maskedAccountNumber = last3Digits ? `****${last3Digits}` : '****';

    return {
      accountName,
      accountNumber,
      last3Digits,
      maskedAccountNumber,
      openingBalance,
      todayInflows: todayInflows || 0,
      todayOutflows: todayOutflows || 0,
      closingBalance: closingBalance !== null ? closingBalance : (openingBalance || 0),
      matchedBranch
    };
  }

  /**
   * Find table header row (e.g. Date, Description, Debit, Credit) and convert rows to JSON
   */
  extractTableRows(matrix) {
    if (!Array.isArray(matrix) || matrix.length === 0) return [];

    let headerRowIdx = -1;
    for (let r = 0; r < matrix.length; r++) {
      const row = matrix[r];
      if (!Array.isArray(row)) continue;
      const rowStr = row.join(' ').toLowerCase();
      if ((rowStr.includes('date') || rowStr.includes('txn')) && (rowStr.includes('debit') || rowStr.includes('credit') || rowStr.includes('withdrawal') || rowStr.includes('deposit') || rowStr.includes('amount') || rowStr.includes('particular'))) {
        headerRowIdx = r;
        break;
      }
    }

    if (headerRowIdx === -1 || headerRowIdx >= matrix.length - 1) {
      return [];
    }

    const headers = matrix[headerRowIdx].map(h => String(h || '').trim());
    const dataRows = [];

    for (let r = headerRowIdx + 1; r < matrix.length; r++) {
      const row = matrix[r];
      if (!Array.isArray(row) || row.every(cell => cell === '' || cell === undefined || cell === null)) continue;

      const obj = {};
      let hasData = false;
      for (let c = 0; c < headers.length; c++) {
        const headerKey = headers[c] || `col_${c}`;
        obj[headerKey] = row[c];
        if (row[c] !== undefined && row[c] !== '') hasData = true;
      }
      if (hasData) {
        dataRows.push(obj);
      }
    }

    return dataRows;
  }

  /**
   * Basic PDF statement extractor layer
   */
  parsePdfStatement(buffer, metadata) {
    const text = buffer.toString('utf-8');
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    
    let rows = [];
    for (let i = 0; i < Math.min(lines.length, 100); i++) {
      const line = lines[i];
      const match = line.match(/(\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4})\s+(.+?)\s+([\d,]+\.?\d*)\s*(CR|DR|Credit|Debit)?/i);
      if (match) {
        rows.push({
          date: match[1],
          description: match[2],
          amount: match[3],
          type: match[4] || (match[2].toLowerCase().includes('cr') ? 'CREDIT' : 'DEBIT')
        });
      }
    }

    // Extract summary from text
    const matchedBranch = this.matchBranchFromText(text);
    const last3Digits = matchedBranch?.digits || '';

    return {
      summary: {
        accountName: '',
        last3Digits,
        maskedAccountNumber: last3Digits ? `****${last3Digits}` : '****',
        openingBalance: null,
        todayInflows: 0,
        todayOutflows: 0,
        closingBalance: null,
        matchedBranch
      },
      rows
    };
  }

  /**
   * Map generic column headers to standardized Danzo transaction
   */
  mapRowToStandardTransaction(row, context) {
    const keys = Object.keys(row);
    const getKey = (...candidates) => {
      for (const cand of candidates) {
        const found = keys.find(k => k.trim().toLowerCase().includes(cand.toLowerCase()));
        if (found && row[found] !== undefined && row[found] !== '') return row[found];
      }
      return null;
    };

    const dateVal = getKey('date', 'txn date', 'transaction date', 'value date', 'txndate');
    const descVal = getKey('description', 'particulars', 'narration', 'details', 'remarks', 'payee') || 'Bank Transaction';
    const creditVal = getKey('credit', 'cr', 'deposit', 'received', 'inflow', 'dep');
    const debitVal = getKey('debit', 'dr', 'withdrawal', 'withdraw', 'withdrawl', 'withdrw', 'paid', 'payment', 'outflow', 'w/d');
    const amountVal = getKey('amount', 'txn amount', 'total', 'net amount');
    const refVal = getKey('ref', 'reference', 'chq', 'cheque', 'utr', 'txn id') || '';

    let type = 'DEBIT';
    let amount = 0;

    const parsedCredit = this.parseCurrencyNumber(creditVal);
    const parsedDebit = this.parseCurrencyNumber(debitVal);
    const parsedAmount = this.parseCurrencyNumber(amountVal);

    if (parsedCredit !== null && parsedCredit > 0) {
      type = 'CREDIT';
      amount = parsedCredit;
    } else if (parsedDebit !== null && parsedDebit > 0) {
      type = 'DEBIT';
      amount = parsedDebit;
    } else if (parsedAmount !== null && parsedAmount > 0) {
      amount = parsedAmount;
      const rowType = getKey('type', 'dr/cr', 'cr/dr');
      if (rowType && String(rowType).toUpperCase().includes('CR')) {
        type = 'CREDIT';
      } else if (String(descVal).toUpperCase().includes('CR ') || String(descVal).toUpperCase().includes('CREDIT')) {
        type = 'CREDIT';
      }
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return null;
    }

    let txnDate = new Date();
    if (dateVal) {
      const parsedDate = new Date(dateVal);
      if (!isNaN(parsedDate.getTime())) {
        txnDate = parsedDate;
      }
    }

    const description = String(descVal).trim();
    const category = this.autoCategorize(description, type);
    const reference = String(refVal || '').trim() || `REF-${Math.floor(100000 + Math.random() * 900000)}`;

    const rawHash = crypto.createHash('sha256')
      .update(`${context.bankCode}-${txnDate.toISOString().split('T')[0]}-${amount}-${type}-${description}-${reference}`)
      .digest('hex');

    return {
      bankId: context.bankId,
      bankName: context.bankName,
      bankCode: context.bankCode,
      maskedAccountNumber: context.maskedAccountNumber,
      transactionDate: txnDate,
      valueDate: txnDate,
      description,
      type,
      amount,
      category,
      reference,
      source: 'MANUAL_UPLOAD',
      rawHash,
      metadata: { originalRow: row }
    };
  }
}
