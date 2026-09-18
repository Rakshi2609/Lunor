import BankDataSource from './BankDataSource.js';

/**
 * Future Direct API Integration Connector for ICICI Corporate API Banking
 */
export default class ICICIBankSource extends BankDataSource {
  constructor(config = {}) {
    super({ name: 'ICICIBankSource', bankCode: 'ICICI', ...config });
  }

  async fetchStatement({ accountId, fromDate, toDate }) {
    console.log(`[ICICIBankSource] Direct API Connector stub triggered for account: ${accountId}`);
    return { status: 'STUB_READY', message: 'ICICI Corporate API integration will be activated in phase 2.' };
  }
}
