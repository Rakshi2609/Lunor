import BankDataSource from './BankDataSource.js';

/**
 * Future Direct API Integration Connector for HDFC Corporate NetBanking / Open Banking
 */
export default class HDFCBankSource extends BankDataSource {
  constructor(config = {}) {
    super({ name: 'HDFCBankSource', bankCode: 'HDFC', ...config });
  }

  async fetchStatement({ accountId, fromDate, toDate }) {
    console.log(`[HDFCBankSource] Direct API Connector stub triggered for account: ${accountId}`);
    return { status: 'STUB_READY', message: 'HDFC Corporate API integration will be activated in phase 2.' };
  }
}
