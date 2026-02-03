import { AppData, FinancialRecord, RecordType } from '../types';

/**
 * Helper to aggregate data by account
 */
const aggregateByAccount = (records: FinancialRecord[]) => {
    const map = new Map<string, number>();
    records.forEach(r => {
        const current = map.get(r.accountCode) || 0;
        map.set(r.accountCode, current + r.amount);
    });
    return map;
};

/**
 * 1. Variance Analysis: Top 5 Drivers of Forecast vs Actual variance
 * Returns simple text summary or object for the agent to interpret.
 */
export const analyzeVariance = (data: AppData, planId: string, startPeriod?: string, endPeriod?: string) => {
    const actuals = data.records.filter(r => r.type === RecordType.ACTUAL);
    const plan = data.records.filter(r => r.planId === planId);

    // Filter time range
    const filter = (r: FinancialRecord) => {
        if (startPeriod && r.period < startPeriod) return false;
        if (endPeriod && r.period > endPeriod) return false;
        return true;
    };

    const actualsMap = aggregateByAccount(actuals.filter(filter));
    const planMap = aggregateByAccount(plan.filter(filter));

    const variances: { account: string, actual: number, plan: number, var: number, absVar: number, pct: number }[] = [];

    // Keys union
    const allAccounts = new Set([...actualsMap.keys(), ...planMap.keys()]);

    allAccounts.forEach(accCode => {
        const act = actualsMap.get(accCode) || 0;
        const pln = planMap.get(accCode) || 0;
        const diff = act - pln;
        const pct = pln !== 0 ? diff / pln : (act !== 0 ? 1 : 0);

        // Map code to name
        const accName = data.accounts.find(a => a.code === accCode)?.name || accCode;

        variances.push({
            account: accName,
            actual: act,
            plan: pln,
            var: diff,
            absVar: Math.abs(diff),
            pct: pct
        });
    });

    // Sort by absolute variance impact
    variances.sort((a, b) => b.absVar - a.absVar);

    return variances.slice(0, 5);
};

/**
 * 2. Profit Walk (Bridge)
 * Comparing Period A vs Period B (or Actual vs Budget)
 * Simplistic version: Walks P&L Lines from Revenue down to Net Income
 */
export const generateProfitWalk = (data: AppData, planId: string, comparison: 'YoY' | 'PlanVsActual' = 'PlanVsActual', year: number) => {
    // For MVP, strict implementation of Plan vs Actual for the specified year
    const act = data.records.filter(r => r.type === RecordType.ACTUAL && r.period.startsWith(String(year)));
    const pln = data.records.filter(r => r.planId === planId && r.period.startsWith(String(year)));

    const getGroupTotal = (recs: FinancialRecord[], category: string) => {
        return recs
            .filter(r => {
                const acc = data.accounts.find(a => a.code === r.accountCode);
                return acc?.category === category;
            })
            .reduce((sum, r) => sum + r.amount, 0);
    };

    const categories = ['Revenue', 'COGS', 'OpEx', 'Depreciation', 'Interest', 'Taxes'];

    const walk = categories.map(cat => ({
        category: cat,
        actual: getGroupTotal(act, cat),
        plan: getGroupTotal(pln, cat)
    }));

    // Add Margin calculations
    const calcMargin = (rev: number, cogs: number) => rev - cogs;
    const calcEBITDA = (margin: number, opex: number) => margin - opex;

    const revRow = walk.find(w => w.category === 'Revenue')!;
    const cogsRow = walk.find(w => w.category === 'COGS')!;
    const opexRow = walk.find(w => w.category === 'OpEx')!;

    const summary = {
        Revenue: { act: revRow.actual, plan: revRow.plan, diff: revRow.actual - revRow.plan },
        GrossMargin: {
            act: calcMargin(revRow.actual, cogsRow.actual),
            plan: calcMargin(revRow.plan, cogsRow.plan),
            diff: calcMargin(revRow.actual, cogsRow.actual) - calcMargin(revRow.plan, cogsRow.plan)
        },
        EBITDA: {
            act: calcEBITDA(calcMargin(revRow.actual, cogsRow.actual), opexRow.actual),
            plan: calcEBITDA(calcMargin(revRow.plan, cogsRow.plan), opexRow.plan),
            diff: calcEBITDA(calcMargin(revRow.actual, cogsRow.actual), opexRow.actual) - calcEBITDA(calcMargin(revRow.plan, cogsRow.plan), opexRow.plan)
        }
    };

    return summary;
};
