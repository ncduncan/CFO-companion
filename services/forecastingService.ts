import { FinancialRecord, ForecastAssumption, AppData, RecordType } from '../types';

/**
 * Calculates a linear regression trend from historical data and projects it forward.
 */
const calculateTrend = (history: FinancialRecord[], periodsToForecast: number): number[] => {
    if (history.length < 2) return Array(periodsToForecast).fill(history[0]?.amount || 0);

    const n = history.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    history.forEach((record, index) => {
        sumX += index;
        sumY += record.amount;
        sumXY += index * record.amount;
        sumXX += index * index;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return Array.from({ length: periodsToForecast }, (_, i) => {
        const x = n + i;
        return Math.max(0, slope * x + intercept); // Prevent negative revenue/costs if trend is weird
    });
};

/**
 * Generates forecast records for a specific assumption over a given date range.
 */
export const generateForecast = (
    assumption: ForecastAssumption,
    data: AppData,
    startDate: string, // YYYY-MM
    endDate: string
): FinancialRecord[] => {
    // 1. Filter History for this specific dimension
    // For backtesting, we might filter differently, but for forward looking:
    const history = data.records
        .filter(r =>
            r.type === RecordType.ACTUAL &&
            r.accountCode === assumption.accountCode &&
            (!assumption.productLineCode || r.productLineCode === assumption.productLineCode) &&
            (!assumption.costCenterCode || r.costCenterCode === assumption.costCenterCode)
        )
        .sort((a, b) => a.period.localeCompare(b.period));

    // 2. Determine number of months to forecast
    // Simple logic: Assume startDate and endDate are valid
    const start = new Date(startDate + '-01');
    const end = new Date(endDate + '-01');
    const monthCount = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;

    if (monthCount <= 0) return [];

    let forecastedAmounts: number[] = [];

    switch (assumption.method) {
        case 'Trend':
            forecastedAmounts = calculateTrend(history, monthCount);
            break;

        case 'GrowthYearOverYear':
            // Look back 12 months for the base
            const rate = assumption.params.growthRate || 0;
            forecastedAmounts = [];
            for (let i = 0; i < monthCount; i++) {
                const currentMonthDate = new Date(start);
                currentMonthDate.setMonth(start.getMonth() + i);
                // Find comparable month last year
                const lastYearDate = new Date(currentMonthDate);
                lastYearDate.setFullYear(lastYearDate.getFullYear() - 1);
                const lastYearPeriod = lastYearDate.toISOString().slice(0, 7);

                const lastYearRecord = history.find(r => r.period === lastYearPeriod);
                // If no record, maybe fallback to trend or last known? specific requirement? Using fallback for now
                const baseAmount = lastYearRecord ? lastYearRecord.amount : (assumption.params.fallbackValue || 0);
                forecastedAmounts.push(baseAmount * (1 + rate));
            }
            break;

        case 'Manual':
            // Loop through months and grab manual value
            forecastedAmounts = [];
            for (let i = 0; i < monthCount; i++) {
                const currentMonthDate = new Date(start);
                currentMonthDate.setMonth(start.getMonth() + i);
                const period = currentMonthDate.toISOString().slice(0, 7);
                forecastedAmounts.push(assumption.params.manualValues?.[period] || 0);
            }
            break;

        case 'PercentOfRevenue':
            // Sum total revenue for the forecast period (Using existing BUDGET records or calculating?)
            // Complex dependency: It requires Revenue to be forecasted *first*. 
            // For V1, we will look for EXISTING Budget records in the same plan for the same period.
            // Assuming 'REV_SUB', 'REV_SERV', 'REV_HW' are the revenue accounts.
            const pct = assumption.params.percentOfRevenue || 0;
            forecastedAmounts = [];

            for (let i = 0; i < monthCount; i++) {
                const currentMonthDate = new Date(start);
                currentMonthDate.setMonth(start.getMonth() + i);
                const period = currentMonthDate.toISOString().slice(0, 7);

                // Find total revenue for this period in the *current* dataset (Budget or Forecast)
                // Note: This implies the user must forecast revenue first.
                const totalRevenue = data.records
                    .filter(r => r.period === period && r.type === RecordType.BUDGET && r.accountCode.startsWith('REV_')) // Hacky startsWith
                    .reduce((sum, r) => sum + r.amount, 0);

                forecastedAmounts.push(totalRevenue * pct);
            }
            break;

        default:
            forecastedAmounts = Array(monthCount).fill(0);
    }

    // 3. Map amounts to records
    return forecastedAmounts.map((amount, idx) => {
        const d = new Date(start);
        d.setMonth(start.getMonth() + idx);
        return {
            id: crypto.randomUUID(),
            planId: assumption.planId,
            period: d.toISOString().slice(0, 7),
            type: RecordType.BUDGET, // Saved as Budget for now, or new Forecast type? Using Budget for compatibility
            accountCode: assumption.accountCode,
            productLineCode: assumption.productLineCode || '',
            costCenterCode: assumption.costCenterCode || '',
            amount: Math.round(amount) // Rounding for clean UI
        };
    });
};

/**
 * Applies active Risks and Opportunities to the base forecast records.
 * Returns a new array of records with the impacts added.
 */
export const applyRisksAndOps = (
    baseRecords: FinancialRecord[],
    data: AppData,
    planId: string
): FinancialRecord[] => {
    // Filter for relevant items: Matches Plan ID + Included in Budget
    const activeItems = data.opportunities.filter(
        item => item.includedInBudget && item.planId === planId
    );

    // We strictly clone base records to avoid mutations
    let currentRecords = [...baseRecords];

    activeItems.forEach(item => {
        const monthlyImpact = item.estimatedImpact / (item.durationMonths || 1);
        const impactSign = item.type === 'Risk' ? -1 : 1;
        const finalMonthlyAmount = monthlyImpact * impactSign;

        // Calculate start and end indices/dates
        const [startYear, startMonth] = (item.startDate || new Date().toISOString().slice(0, 7)).split('-').map(Number);

        for (let i = 0; i < (item.durationMonths || 1); i++) {
            // Determine date for this month
            const d = new Date(startYear, startMonth - 1 + i, 1);
            // Adjust for TZ/Month rollover
            // Simple string construction is safer
            // let's do simple math
            // Year/Month logic
            let y = startYear;
            let m = startMonth + i;
            while (m > 12) {
                m -= 12;
                y++;
            }
            const period = `${y}-${String(m).padStart(2, '0')}`;

            if (!item.impactAccountCode) continue;

            const existingIndex = currentRecords.findIndex(r =>
                r.period === period &&
                r.planId === planId &&
                r.accountCode === item.impactAccountCode &&
                r.costCenterCode === (item.impactCostCenterCode || '') &&
                r.productLineCode === (item.impactProductLineCode || '')
            );

            if (existingIndex !== -1) {
                // Modify existing
                const existing = currentRecords[existingIndex];
                currentRecords[existingIndex] = {
                    ...existing,
                    amount: existing.amount + finalMonthlyAmount
                };
            } else {
                // Create new record
                currentRecords.push({
                    id: crypto.randomUUID(),
                    planId: planId,
                    period: period,
                    type: RecordType.BUDGET,
                    accountCode: item.impactAccountCode,
                    costCenterCode: item.impactCostCenterCode || '',
                    productLineCode: item.impactProductLineCode || '',
                    amount: finalMonthlyAmount
                });
            }
        }
    });

    return currentRecords;
};
