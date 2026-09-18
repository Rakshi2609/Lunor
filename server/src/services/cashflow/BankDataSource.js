/**
 * BankDataSource Base Abstract Class
 * Future-proof connector architecture allowing manual uploads, direct bank APIs,
 * Account Aggregators (Setu / Finvu / Sahamati), or open banking APIs to be plugged in cleanly.
 */
export default class BankDataSource {
  constructor(config = {}) {
    this.name = config.name || 'GenericBankDataSource';
    this.bankCode = config.bankCode || 'GENERIC';
    this.config = config;
  }

  /**
   * Fetch statement or raw data payload from the source
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  async fetchStatement(params) {
    throw new Error(`fetchStatement() not implemented for ${this.name}`);
  }

  /**
   * Parse and normalize raw source data into Danzo Standard Transaction objects
   * @param {Buffer|String|Object} rawData
   * @param {Object} context
   * @returns {Promise<Array>}
   */
  async normalizeTransactions(rawData, context = {}) {
    throw new Error(`normalizeTransactions() not implemented for ${this.name}`);
  }

  /**
   * Validate account ownership and raw structure
   * @param {Object} data
   * @returns {Boolean}
   */
  validateData(data) {
    return true;
  }

  /**
   * Auto-assign transaction category based on common Indian banking descriptions
   * @param {String} description
   * @param {String} type - CREDIT | DEBIT
   * @returns {String}
   */
  autoCategorize(description = '', type = 'DEBIT') {
    const desc = description.toUpperCase();

    if (desc.includes('SALARY') || desc.includes('PAYROLL') || desc.includes('STAFF') || desc.includes('WAGES')) {
      return 'Payroll & Salaries';
    }
    if (desc.includes('GST') || desc.includes('TDS') || desc.includes('TAX') || desc.includes('CHALLAN') || desc.includes('INCOMETAX') || desc.includes('CBIC')) {
      return 'Statutory & Tax (GST/TDS)';
    }
    if (desc.includes('RENT') || desc.includes('LEASE') || desc.includes('MAINTENANCE') || desc.includes('ELECTRICITY') || desc.includes('INTERNET') || desc.includes('AWS') || desc.includes('GOOGLE CLOUD')) {
      return 'Office & Rent Expenses';
    }
    if (desc.includes('CHG') || desc.includes('CHARGE') || desc.includes('INT.PD') || desc.includes('INTEREST') || desc.includes('ANNUAL FEE') || desc.includes('SMS CHG')) {
      return 'Bank Charges & Interest';
    }
    if (desc.includes('NFT') || desc.includes('NEFT') || desc.includes('RTGS') || desc.includes('IMPS') || desc.includes('UPI') || desc.includes('TRF')) {
      if (type === 'CREDIT') {
        if (desc.includes('CLIENT') || desc.includes('PAYMENT RECEIVED') || desc.includes('INVOICE') || desc.includes('PVT LTD') || desc.includes('CORP')) {
          return 'Customer Receipts';
        }
        return 'Customer Receipts';
      } else {
        if (desc.includes('VENDOR') || desc.includes('SERVICES') || desc.includes('SUPPLIES') || desc.includes('TECH') || desc.includes('CONSULTING')) {
          return 'Vendor Payments';
        }
        return 'Vendor Payments';
      }
    }
    if (desc.includes('SWEEP') || desc.includes('FD') || desc.includes('MUTUAL') || desc.includes('TREASURY') || desc.includes('LIQUID FUND')) {
      return 'Investments & Treasury';
    }
    if (desc.includes('LOAN') || desc.includes('EMI') || desc.includes('DISBURSEMENT')) {
      return 'Loan & Financing';
    }

    return type === 'CREDIT' ? 'Customer Receipts' : 'Vendor Payments';
  }
}
