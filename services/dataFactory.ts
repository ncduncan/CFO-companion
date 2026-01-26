import { AppData, DimensionMapping, FinancialRecord, RecordType, Plan } from '../types';

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

export const ACCOUNTS: DimensionMapping[] = [
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

// Helper to create dummy records
const generateDummyRecords = (productCodes: string[], ccCodes: string[], defaultPlanId: string): FinancialRecord[] => {
    const records: FinancialRecord[] = [];
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

export const generateStandardSaaSData = (): AppData => {
    // Collect all codes for generation
    const productCodes = PROD_LINES.map(p => p.code);
    const ccCodes = COST_CENTERS.map(c => c.code);

    return {
        accounts: ACCOUNTS,
        costCenters: COST_CENTERS,
        productLines: PROD_LINES,
        records: generateDummyRecords(productCodes, ccCodes, DEFAULT_PLAN_ID),
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
