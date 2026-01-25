import { SAAS_CATEGORIES } from './services/financialModel';

export enum RecordType {
  ACTUAL = 'Actual',
  BUDGET = 'Budget',
  FORECAST = 'Forecast'
}

export interface FinancialRecord {
  id: string;
  planId?: string; // If undefined/null, it's "Actuals" or "Historical"
  period: string; // YYYY-MM
  type: RecordType;
  accountCode: string;
  costCenterCode: string;
  productLineCode: string;
  amount: number;
}

export interface DimensionMapping {
  code: string; // Internal ID
  name: string;
  hyperionMap: string;
  category?: string; // For Accounts: Links to Tier 1 Category
}

export interface AppData {
  accounts: DimensionMapping[];
  costCenters: DimensionMapping[];
  productLines: DimensionMapping[];
  records: FinancialRecord[];
  opportunities: ImprovementOpportunity[];
  lastModified: string;
  plans: Plan[];
  assumptions: ForecastAssumption[];
}

export interface Plan {
  id: string;
  name: string; // e.g., "2025 Base Case"
  description?: string;
  startDate: string; // YYYY-MM
  endDate: string;   // YYYY-MM
  status: 'Draft' | 'Active' | 'Archived';
  created: string;
}

export type ForecastMethodType =
  | 'Manual'            // User types monthly values
  | 'Trend'             // Linear regression or CAGR based on history
  | 'GrowthYearOverYear' // Simple % increase over same period last year
  | 'PercentOfRevenue'  // Linked to total revenue (Standard for COGS/OpEx)
  | 'CustomFormula';    // Arithmetic expression using other accounts

export interface ForecastAssumption {
  id: string;
  planId: string;

  // The "Target" intersection being forecasted
  accountCode: string;
  productLineCode?: string; // Optional
  costCenterCode?: string;  // Optional

  method: ForecastMethodType;

  // Configuration for the method
  params: {
    growthRate?: number;       // For GrowthYoY (e.g., 0.05 for 5%)
    percentOfRevenue?: number; // For PercentOfRevenue (e.g., 0.30 for 30%)
    fallbackValue?: number;    // Default if calculation fails
    formula?: string;          // For CustomFormula (e.g., "{REV_SUB} * 0.10 + 5000")
    manualValues?: Record<string, number>; // Map of 'YYYY-MM' -> amount
  };

  // Metadata
  lastUpdated: string;
  backtestAccuracy?: number; // 0-100 score based on historical fit
}

export interface ImprovementOpportunity {
  id: string;
  title: string;
  description: string;
  estimatedImpact: number;
  status: 'Identified' | 'In Progress' | 'Completed' | 'Discarded';
  owner: string;
  includedInBudget: boolean;
  estimatedImpactTiming: string;
  actionDueDate: string; // YYYY-MM-DD
  impactAccountCode?: string; // Link to P&L Line
  impactProductLineCode?: string; // Link to Product Line (Mutually exclusive with Cost Center)
  impactCostCenterCode?: string; // Link to Cost Center (Mutually exclusive with Product Line)
}

// Helper to create dummy records
const generateDummyRecords = (productCodes: string[], ccCodes: string[], defaultPlanId: string): FinancialRecord[] => {
  const records: FinancialRecord[] = [];
  // Generate 3 years of data: 2023, 2024, 2025
  const years = [2023, 2024, 2025];

  years.forEach(year => {
    for (let m = 1; m <= 12; m++) {
      const period = `${year}-${m.toString().padStart(2, '0')}`;

      // Base Seasonality Factor
      const seasonality = 1 + (Math.sin(m) * 0.15);
      // Growth Factor (Year over Year)
      const growth = 1 + ((year - 2023) * 0.12);

      // Random monthly variance base
      const variance = () => 0.95 + Math.random() * 0.1;

      const baseAmount = 1000 * seasonality * growth;

      // --- Revenue & COGS per Product ---
      productCodes.forEach(pl => {
        let mixFactor = 1;
        if (pl === 'PL_IOT') mixFactor = 1.5;
        if (pl === 'PL_LEG') mixFactor = 0.6; // Declining legacy product

        // Revenue
        records.push({
          id: crypto.randomUUID(),
          planId: defaultPlanId,
          period,
          type: RecordType.BUDGET,
          accountCode: 'REV_SUB',
          costCenterCode: '200', // Sales maps to Sales CC usually for booking, or dummy
          productLineCode: pl,
          amount: baseAmount * 80 * mixFactor
        });

        // Actuals
        if (year < 2025 || (year === 2025 && m <= 4)) {
          records.push({
            id: crypto.randomUUID(),
            // No planId for Actuals
            period,
            type: RecordType.ACTUAL,
            accountCode: 'REV_SUB',
            costCenterCode: '200',
            productLineCode: pl,
            amount: (baseAmount * 80 * mixFactor) * variance()
          });
        }

        // COGS
        records.push({
          id: crypto.randomUUID(),
          planId: defaultPlanId,
          period,
          type: RecordType.BUDGET,
          accountCode: 'COGS_HOST',
          costCenterCode: '100',
          productLineCode: pl,
          amount: baseAmount * 25 * mixFactor
        });

        if (year < 2025 || (year === 2025 && m <= 4)) {
          records.push({
            id: crypto.randomUUID(),
            // No planId for Actuals
            period,
            type: RecordType.ACTUAL,
            accountCode: 'COGS_HOST',
            costCenterCode: '100',
            productLineCode: pl,
            amount: (baseAmount * 25 * mixFactor) * variance()
          });
        }
      });

      // --- OpEx per Cost Center ---
      ccCodes.forEach(cc => {
        let sizeFactor = 1;
        if (cc === '900') sizeFactor = 0.5; // Corp is smaller than R&D/Sales headcount usually

        // Salaries
        records.push({
          id: crypto.randomUUID(),
          planId: defaultPlanId,
          period,
          type: RecordType.BUDGET,
          accountCode: 'EXP_GEN_PPL',
          costCenterCode: cc,
          productLineCode: '',
          amount: baseAmount * 20 * sizeFactor
        });

        // Deprecitation (Allocated)
        records.push({
          id: crypto.randomUUID(),
          planId: defaultPlanId,
          period,
          type: RecordType.BUDGET,
          accountCode: 'EXP_DEP',
          costCenterCode: cc,
          productLineCode: '',
          amount: baseAmount * 4 * sizeFactor
        });

        // Actuals
        if (year < 2025 || (year === 2025 && m <= 4)) {
          records.push({
            id: crypto.randomUUID(),
            // No planId for Actuals
            period,
            type: RecordType.ACTUAL,
            accountCode: 'EXP_GEN_PPL',
            costCenterCode: cc,
            productLineCode: '',
            amount: (baseAmount * 20 * sizeFactor) * variance()
          });
          records.push({
            id: crypto.randomUUID(),
            // No planId for Actuals
            period,
            type: RecordType.ACTUAL,
            accountCode: 'EXP_DEP',
            costCenterCode: cc,
            productLineCode: '',
            amount: (baseAmount * 4 * sizeFactor) // Fixed mostly
          });
        }
      });

      // --- Entity Level Items (Taxes, Other, CapEx) ---
      ['INC_OTHER', 'EXP_TAX', 'CF_CAPEX', 'CF_WC'].forEach(acc => {
        let factor = 0;
        if (acc === 'INC_OTHER') factor = 2;
        if (acc === 'EXP_TAX') factor = 12;
        if (acc === 'CF_CAPEX') factor = 8;
        if (acc === 'CF_WC') factor = -4;

        records.push({
          id: crypto.randomUUID(),
          planId: defaultPlanId,
          period,
          type: RecordType.BUDGET,
          accountCode: acc,
          costCenterCode: '900',
          productLineCode: '',
          amount: baseAmount * factor
        });

        if (year < 2025 || (year === 2025 && m <= 4)) {
          records.push({
            id: crypto.randomUUID(),
            // No planId for Actuals
            period,
            type: RecordType.ACTUAL,
            accountCode: acc,
            costCenterCode: '900',
            productLineCode: '',
            amount: (baseAmount * factor) * variance()
          });
        }
      });

    }
  });

  return records;
};

// Initial Data Definitions
export const PROD_LINES: DimensionMapping[] = [
  { code: 'PL_IOT', name: 'Industrial IoT Platform', hyperionMap: 'PROD_IOT' },
  { code: 'PL_ANL', name: 'Predictive Analytics', hyperionMap: 'PROD_PREDICT' },
  { code: 'PL_SERV', name: 'Implementation Services', hyperionMap: 'PROD_SERV' },
  { code: 'PL_HW', name: 'Edge Hardware', hyperionMap: 'PROD_HW' },
  { code: 'PL_LEG', name: 'Legacy Systems', hyperionMap: 'PROD_LEG' }
];

export const COST_CENTERS: DimensionMapping[] = [
  { code: '100', name: 'Research & Development', hyperionMap: 'CC_RD' },
  { code: '110', name: 'IT & Infrastructure', hyperionMap: 'CC_IT' },
  { code: '200', name: 'Sales & Marketing', hyperionMap: 'CC_SM' },
  { code: '300', name: 'Professional Services', hyperionMap: 'CC_DEL' },
  { code: '800', name: 'Human Resources', hyperionMap: 'CC_HR' },
  { code: '900', name: 'General & Admin', hyperionMap: 'CC_CORP' }
];

export const DEFAULT_PLAN_ID = 'plan-2025-base';

export const INITIAL_DATA: AppData = {
  accounts: [
    // Revenue
    { code: 'REV_SUB', name: 'Subscription Revenue', hyperionMap: '40000', category: 'Revenue' },
    { code: 'REV_SERV', name: 'Services Revenue', hyperionMap: '41000', category: 'Revenue' },
    { code: 'REV_HW', name: 'Hardware Revenue', hyperionMap: '42000', category: 'Revenue' },
    // COGS
    { code: 'COGS_HOST', name: 'Hosting & Infrastructure', hyperionMap: '50000', category: 'COGS' },
    { code: 'COGS_SERV', name: 'Services COS', hyperionMap: '51000', category: 'COGS' },
    { code: 'COGS_HW', name: 'Hardware Costs', hyperionMap: '52000', category: 'COGS' },
    // OpEx
    { code: 'EXP_GEN_PPL', name: 'Salaries & Wages', hyperionMap: '60000', category: 'OpEx' },
    { code: 'EXP_MKT', name: 'Marketing Programs', hyperionMap: '61000', category: 'OpEx' },
    { code: 'EXP_OFFICE', name: 'Office & General', hyperionMap: '62000', category: 'OpEx' },
    { code: 'EXP_SW', name: 'Software Subscriptions', hyperionMap: '63000', category: 'OpEx' },
    { code: 'EXP_TRAVEL', name: 'Travel & Entertainment', hyperionMap: '64000', category: 'OpEx' },
    // Depreciation 
    { code: 'EXP_DEP', name: 'Depreciation & Amortization', hyperionMap: '69000', category: 'Depreciation' },
    // Other Income / Expense 
    { code: 'INC_OTHER', name: 'Other Income / (Expense)', hyperionMap: '70000', category: 'Other Income' },
    // Taxes
    { code: 'EXP_TAX', name: 'Income Taxes', hyperionMap: '80000', category: 'Taxes' },
    // FCF
    { code: 'CF_CAPEX', name: 'Capital Expenditures', hyperionMap: '90000', category: 'Cash Flow Items' },
    { code: 'CF_WC', name: 'Change in Working Capital', hyperionMap: '91000', category: 'Cash Flow Items' }
  ],
  costCenters: COST_CENTERS,
  productLines: PROD_LINES,
  records: [], // EMPTY BY DEFAULT
  opportunities: [],
  plans: [],
  assumptions: [],
  lastModified: new Date().toISOString()
};