import { AppData, DimensionMapping, FinancialRecord, RecordType, Plan } from '../types';

const PROD_LINES: DimensionMapping[] = [
    { code: 'PL_IOT', name: 'Industrial IoT Platform', hyperionMap: 'PROD_IOT' },
    { code: 'PL_ANL', name: 'Predictive Analytics', hyperionMap: 'PROD_PREDICT' },
    { code: 'PL_SERV', name: 'Implementation Services', hyperionMap: 'PROD_SERV' },
    { code: 'PL_HW', name: 'Edge Hardware', hyperionMap: 'PROD_HW' },
    { code: 'PL_LEG', name: 'Legacy Systems', hyperionMap: 'PROD_LEG' }
];

const COST_CENTERS: DimensionMapping[] = [
    { code: '100', name: 'Research & Development', hyperionMap: 'CC_RD' },
    { code: '110', name: 'IT & Infrastructure', hyperionMap: 'CC_IT' },
    { code: '200', name: 'Sales & Marketing', hyperionMap: 'CC_SM' },
    { code: '300', name: 'Professional Services', hyperionMap: 'CC_DEL' },
    { code: '800', name: 'Human Resources', hyperionMap: 'CC_HR' },
    { code: '900', name: 'General & Admin', hyperionMap: 'CC_CORP' }
];

const ACCOUNTS: DimensionMapping[] = [
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
];

const DEFAULT_PLAN_ID = 'plan-2025-base';

const generateRecords = (): FinancialRecord[] => {
    const records: FinancialRecord[] = [];
    const years = [2023, 2024, 2025];

    // Helper to get base value for an account type
    const getBaseValue = (category: string | undefined): number => {
        switch (category) {
            case 'Revenue': return 80000;
            case 'COGS': return 25000;
            case 'OpEx': return 15000;
            case 'Depreciation': return 5000;
            case 'Taxes': return 10000;
            case 'Cash Flow Items': return 20000;
            default: return 5000;
        }
    };

    years.forEach(year => {
        for (let m = 1; m <= 12; m++) {
            const period = `${year}-${m.toString().padStart(2, '0')}`;
            const seasonality = 1 + (Math.sin(m) * 0.15);
            const growth = 1 + ((year - 2023) * 0.12); // 12% YoY growth
            const variance = () => 0.95 + Math.random() * 0.1; // +/- 5% variance

            ACCOUNTS.forEach(account => {
                const baseVal = getBaseValue(account.category) * seasonality * growth;

                // Generate Budget Record
                records.push({
                    id: crypto.randomUUID(),
                    planId: DEFAULT_PLAN_ID,
                    period,
                    type: RecordType.BUDGET,
                    accountCode: account.code,
                    costCenterCode: 'GEN_CC', // Simplified
                    productLineCode: 'GEN_PL', // Simplified
                    amount: Math.round(baseVal)
                });

                // Generate Actual Record (Up to Apr 2025)
                if (year < 2025 || (year === 2025 && m <= 4)) {
                    records.push({
                        id: crypto.randomUUID(),
                        period,
                        type: RecordType.ACTUAL,
                        accountCode: account.code,
                        costCenterCode: 'GEN_CC',
                        productLineCode: 'GEN_PL',
                        amount: Math.round(baseVal * variance())
                    });
                }
            });
        }
    });

    return records;
};

export const generateStandardSaaSData = (): AppData => {
    return {
        accounts: ACCOUNTS,
        costCenters: COST_CENTERS,
        productLines: PROD_LINES,
        records: generateRecords(),
        opportunities: [
            {
                id: 'opp-1',
                title: 'Cloud Cost Optimization',
                description: 'Migrate non-production workloads to spot instances.',
                estimatedImpact: 120000,
                status: 'In Progress',
                owner: 'CTO',
                includedInBudget: false,
                estimatedImpactTiming: 'Start Q3 2024',
                actionDueDate: '2024-06-30',
                impactAccountCode: 'COGS_HOST',
                impactProductLineCode: 'PL_IOT'
            }
        ],
        plans: [
            {
                id: DEFAULT_PLAN_ID,
                name: '2025 Base Budget',
                startDate: '2025-01',
                endDate: '2025-12',
                status: 'Active',
                created: new Date().toISOString()
            }
        ],
        assumptions: [],
        lastModified: new Date().toISOString()
    };
};
