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
  opportunities: RiskOpportunity[];
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

  // New Fields for Scenarios & Workflow
  type: 'Base' | 'Scenario' | 'Interim';
  parentPlanId?: string; // If derived from another plan
  isLocked: boolean;
  lockDate?: string;
  isWorkingPlan: boolean; // The default plan for analysis (single active)
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

export interface RiskOpportunity {
  id: string;
  planId: string; // Linked to a specific Plan
  title: string;
  description: string;
  type: 'Risk' | 'Opportunity';
  estimatedImpact: number; // Total impact over duration
  status: 'Identified' | 'In Progress' | 'Completed' | 'Discarded';
  owner: string;
  includedInBudget: boolean;

  // Timing Logic
  startDate: string; // YYYY-MM
  durationMonths: number; // e.g., 12

  // Optional Legacy / Descriptive
  estimatedImpactTiming?: string; // e.g. "Q3 Ramp" (Text)
  actionDueDate: string; // YYYY-MM-DD

  impactAccountCode?: string; // Link to P&L Line
  impactProductLineCode?: string; // Link to Product Line (Mutually exclusive with Cost Center)
  impactCostCenterCode?: string; // Link to Cost Center (Mutually exclusive with Product Line)
}



export const INITIAL_DATA: AppData = {
  accounts: [],
  costCenters: [],
  productLines: [],
  records: [],
  opportunities: [],
  plans: [],
  assumptions: [],
  lastModified: new Date().toISOString()
};