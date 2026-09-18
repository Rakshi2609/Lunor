import BankDataSource from './BankDataSource.js';

/**
 * Future Direct API Integration Connector for SBI e-Pay / Yono Business API
 */
export default class SBIBankSource extends BankDataSource {
  constructor(config = {}) {
    super({ name: 'SBIBankSource', bankCode: 'SBI', ...config });
  }

  async fetchStatement({ accountId, fromDate, toDate }) {
    console.log(`[SBIBankSource] Direct API Connector stub triggered for account: ${accountId}`);
    return { status: 'STUB_READY', message: 'SBI Corporate API integration will be activated in phase 2.' };
  }
}
