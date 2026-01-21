import { RecordType, DimensionMapping } from '../types';

export enum AccountCategory {
  REVENUE = 'Revenue',
  COGS = 'COGS',
  OPEX = 'OpEx',
  DEPRECIATION = 'Depreciation',
  OTHER_INCOME = 'Other Income',
  TAXES = 'Taxes',
  CASH_FLOW = 'Cash Flow Items'
}

export const SAAS_CATEGORIES = [
  AccountCategory.REVENUE,
  AccountCategory.COGS,
  AccountCategory.OPEX,
  AccountCategory.DEPRECIATION,
  AccountCategory.OTHER_INCOME,
  AccountCategory.TAXES,
  AccountCategory.CASH_FLOW
];

// Calculation Helpers
export const calculatePnL = (records: any[], accounts: DimensionMapping[], type: RecordType) => {
  
  // Helper to map account code to category dynamically based on user settings
  const getCategory = (code: string): string | undefined => {
    return accounts.find(a => a.code === code)?.category;
  };

  const sumByCat = (cat: string) => {
    return records
      .filter(r => r.type === type && getCategory(r.accountCode) === cat)
      .reduce((sum, r) => sum + r.amount, 0);
  };

  // 1. Gross Profit
  const revenue = sumByCat(AccountCategory.REVENUE);
  const cogs = sumByCat(AccountCategory.COGS);
  const grossProfit = revenue - cogs;
  
  // 2. OpEx & EBIT
  const opex = sumByCat(AccountCategory.OPEX);
  const dep = sumByCat(AccountCategory.DEPRECIATION);
  const otherIncome = sumByCat(AccountCategory.OTHER_INCOME);
  
  const totalOpEx = opex + dep;
  
  // EBIT = GP - OpEx - Dep + Other Income (User requested Other Income inside EBIT)
  const ebit = grossProfit - totalOpEx + otherIncome; 
  const ebitda = ebit + dep; 

  // 3. Net Income
  const taxes = sumByCat(AccountCategory.TAXES);
  
  const netIncome = ebit - taxes;

  // 4. Free Cash Flow
  // FCF = Net Income + D&A - CapEx - Change in WC
  const cfItems = sumByCat(AccountCategory.CASH_FLOW); 
  
  const fcf = netIncome + dep - cfItems; 

  return { revenue, cogs, grossProfit, opex, dep, totalOpEx, ebit, ebitda, otherIncome, taxes, netIncome, fcf, cfItems };
};