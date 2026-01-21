import React, { useState, useMemo } from 'react';
import { AppData, RecordType, DimensionMapping } from '../types';
import { Card } from '../components/ui/Card';
import { AccountCategory } from '../services/financialModel';
import { Calendar, Filter, ArrowDownRight, ArrowUpRight, ChevronRight, ChevronDown } from 'lucide-react';

interface ReportingProps {
  data: AppData;
}

type TimeBasis = 'Monthly' | 'Quarterly' | 'YTD' | 'TTM' | 'Year';

export const Reporting: React.FC<ReportingProps> = ({ data }) => {
  const [timeBasis, setTimeBasis] = useState<TimeBasis>('Year');
  
  // Calculate available years and default to most recent
  const availableYears = useMemo(() => {
      const years = new Set(data.records.map(r => parseInt(r.period.split('-')[0])));
      if (years.size === 0) years.add(new Date().getFullYear());
      return Array.from(years).sort();
  }, [data.records]);

  const maxYear = availableYears[availableYears.length - 1];

  // For Month/Qtr selection
  const [selectedDate, setSelectedDate] = useState<string>(`${maxYear}-12`); // Format YYYY-MM
  // For Year selection
  const [selectedYear, setSelectedYear] = useState<number>(maxYear);
  
  const [entityFilter, setEntityFilter] = useState<string>('');
  
  // Expanded Categories State
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({
    [AccountCategory.REVENUE]: true,
    [AccountCategory.COGS]: true,
    [AccountCategory.OPEX]: true,
    [AccountCategory.CASH_FLOW]: true,
    'NI_WALK': false 
  });

  const toggleCat = (cat: string) => setExpandedCats(prev => ({...prev, [cat]: !prev[cat]}));

  // --- 1. Aggregation Logic ---

  // Determine the range of periods to aggregate based on TimeBasis
  const targetPeriods = useMemo(() => {
    const periods: string[] = [];
    const [yStr, mStr] = selectedDate.split('-');
    const year = parseInt(yStr);
    const month = parseInt(mStr);

    if (timeBasis === 'Year') {
       // Use selectedYear state
       for(let i=1; i<=12; i++) periods.push(`${selectedYear}-${i.toString().padStart(2, '0')}`);
    } 
    else if (timeBasis === 'Monthly') {
       periods.push(selectedDate);
    }
    else if (timeBasis === 'Quarterly') {
       // Determine quarter of selectedDate
       const q = Math.ceil(month / 3);
       const startMonth = (q-1)*3 + 1;
       for(let i=0; i<3; i++) periods.push(`${year}-${(startMonth+i).toString().padStart(2, '0')}`);
    }
    else if (timeBasis === 'YTD') {
       for(let i=1; i<=month; i++) periods.push(`${year}-${i.toString().padStart(2, '0')}`);
    }
    else if (timeBasis === 'TTM') {
       // 12 months ending selectedDate
       // Need to handle year boundary
       let currY = year;
       let currM = month;
       for(let i=0; i<12; i++) {
          periods.push(`${currY}-${currM.toString().padStart(2, '0')}`);
          currM--;
          if (currM === 0) { currM = 12; currY--; }
       }
    }
    return periods;
  }, [timeBasis, selectedDate, selectedYear]);

  // Prior Year Periods (shift targetPeriods back 1 year)
  const pyPeriods = useMemo(() => {
    return targetPeriods.map(p => {
        const [y, m] = p.split('-');
        return `${parseInt(y)-1}-${m}`;
    });
  }, [targetPeriods]);

  const getAmount = (type: RecordType, periods: string[], accountCode: string) => {
    return data.records
      .filter(r => 
         r.type === type && 
         r.accountCode === accountCode && 
         periods.includes(r.period) &&
         // Entity Filter
         (entityFilter === '' || 
          (entityFilter.startsWith('PL|') && r.productLineCode === entityFilter.split('|')[1]) ||
          (entityFilter.startsWith('CC|') && r.costCenterCode === entityFilter.split('|')[1]))
      )
      .reduce((sum, r) => sum + r.amount, 0);
  };

  // --- 2. Row Rendering ---

  const format = (val: number, isPct: boolean = false) => {
    if (isPct) return `${val.toFixed(1)}%`;
    if (val === 0) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  const renderRow = (
      label: string, 
      actual: number, 
      budget: number, 
      py: number, 
      indent: number = 0,
      isBold: boolean = false,
      isExpense: boolean = false,
      isPct: boolean = false,
      onClick?: () => void,
      chevron?: boolean,
      isExpanded?: boolean,
      isItalic?: boolean
  ) => {
    const variance = actual - budget;
    const isFavorable = isExpense ? variance <= 0 : variance >= 0;
    const varPct = budget !== 0 ? (variance / budget) * 100 : 0;
    
    // Bar Chart Calculation
    const maxBar = 100;
    const barWidth = Math.min(Math.abs(varPct), maxBar); 

    return (
        <tr 
            key={label} 
            className={`
                border-b border-slate-50 hover:bg-slate-50 transition-colors 
                ${isBold ? 'font-bold text-slate-800 bg-slate-50/50' : 'text-slate-600'}
                ${isItalic ? 'italic' : ''}
                ${onClick ? 'cursor-pointer' : ''}
            `}
            onClick={onClick}
        >
            <td className="px-4 py-2 flex items-center gap-2">
                <div style={{ width: indent * 20 }} />
                {chevron && (
                    isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                )}
                {label}
            </td>
            <td className="px-4 py-2 text-right font-mono text-slate-700">{format(actual, isPct)}</td>
            <td className="px-4 py-2 text-right font-mono text-slate-500 hidden md:table-cell">{format(budget, isPct)}</td>
            
            {/* Variance Visual */}
            <td className="px-4 py-2 w-[180px] hidden sm:table-cell">
               {!isPct && (
                 <div className="flex items-center w-full h-full gap-1 opacity-80">
                    <div className="flex-1 flex justify-end">
                       {!isFavorable && (
                         <div className="h-1.5 rounded-l bg-rose-500" style={{ width: `${barWidth}%` }} />
                       )}
                    </div>
                    <div className="w-px h-3 bg-slate-300"></div>
                    <div className="flex-1 flex justify-start">
                       {isFavorable && (
                         <div className="h-1.5 rounded-r bg-emerald-500" style={{ width: `${barWidth}%` }} />
                       )}
                    </div>
                 </div>
               )}
            </td>

            <td className={`px-4 py-2 text-right text-xs font-bold hidden md:table-cell ${isFavorable ? 'text-emerald-600' : 'text-rose-600'}`}>
                {!isPct && (
                     <span className="flex items-center justify-end gap-1">
                        {Math.abs(variance) > 0 && (isFavorable ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>)}
                        {format(Math.abs(variance), false)}
                     </span>
                )}
            </td>
            
            <td className="px-4 py-2 text-right font-mono text-slate-400 hidden lg:table-cell">{format(py, isPct)}</td>
        </tr>
    );
  };

  // --- 3. Section Builders ---

  const buildCategorySection = (catName: string, accounts: DimensionMapping[], isExpense: boolean = false) => {
    const catActual = accounts.reduce((sum, acc) => sum + getAmount(RecordType.ACTUAL, targetPeriods, acc.code), 0);
    const catBudget = accounts.reduce((sum, acc) => sum + getAmount(RecordType.BUDGET, targetPeriods, acc.code), 0);
    const catPy = accounts.reduce((sum, acc) => sum + getAmount(RecordType.ACTUAL, pyPeriods, acc.code), 0);

    const isExpanded = expandedCats[catName];

    return (
        <React.Fragment key={catName}>
            {renderRow(catName, catActual, catBudget, catPy, 0, true, isExpense, false, () => toggleCat(catName), true, isExpanded)}
            {isExpanded && accounts.map(acc => {
                const a = getAmount(RecordType.ACTUAL, targetPeriods, acc.code);
                const b = getAmount(RecordType.BUDGET, targetPeriods, acc.code);
                const p = getAmount(RecordType.ACTUAL, pyPeriods, acc.code);
                return renderRow(acc.name, a, b, p, 1, false, isExpense);
            })}
        </React.Fragment>
    );
  };

  // Group accounts
  const groupedAccounts = useMemo(() => {
    const map: Record<string, DimensionMapping[]> = {};
    data.accounts.forEach(acc => {
        if (!acc.category) return;
        if (!map[acc.category]) map[acc.category] = [];
        map[acc.category].push(acc);
    });
    return map;
  }, [data.accounts]);

  // Aggregation Helpers for High Level Rows
  const calcTotal = (cats: string[], type: RecordType, periods: string[]) => {
      return cats.reduce((total, cat) => {
          const accs = groupedAccounts[cat] || [];
          return total + accs.reduce((sum, acc) => sum + getAmount(type, periods, acc.code), 0);
      }, 0);
  };
  
  const getValues = (cats: string[]) => {
      return {
          act: calcTotal(cats, RecordType.ACTUAL, targetPeriods),
          bud: calcTotal(cats, RecordType.BUDGET, targetPeriods),
          py: calcTotal(cats, RecordType.ACTUAL, pyPeriods)
      };
  };

  const revenue = getValues([AccountCategory.REVENUE]);
  const cogs = getValues([AccountCategory.COGS]);
  const opex = getValues([AccountCategory.OPEX]);
  const dep = getValues([AccountCategory.DEPRECIATION]);
  const otherInc = getValues([AccountCategory.OTHER_INCOME]);
  const taxes = getValues([AccountCategory.TAXES]);
  
  // Formulas
  const grossProfit = { act: revenue.act - cogs.act, bud: revenue.bud - cogs.bud, py: revenue.py - cogs.py };
  
  // EBIT = Gross Profit - OpEx - Dep + Other Income
  const ebit = { 
      act: grossProfit.act - opex.act - dep.act + otherInc.act, 
      bud: grossProfit.bud - opex.bud - dep.bud + otherInc.bud, 
      py: grossProfit.py - opex.py - dep.py + otherInc.py
  };
  
  const netIncome = {
      act: ebit.act - taxes.act,
      bud: ebit.bud - taxes.bud,
      py: ebit.py - taxes.py
  };

  // FCF Walk Items
  const cfAccounts = groupedAccounts[AccountCategory.CASH_FLOW] || [];
  const cfTotals = getValues([AccountCategory.CASH_FLOW]); 
  
  // FCF = Net Income + Dep - CapEx - WC
  const fcf = {
      act: netIncome.act + dep.act - cfTotals.act,
      bud: netIncome.bud + dep.bud - cfTotals.bud,
      py: netIncome.py + dep.py - cfTotals.py
  };

  return (
    <div className="space-y-6 animate-fade-in">
       
       {/* Top Controls */}
       <Card className="border-l-4 border-l-purple-600">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
              
              <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                     <Calendar className="text-slate-400" size={18} />
                     <select 
                        className="border border-slate-300 rounded px-2 py-1.5 text-sm font-semibold bg-white focus:ring-purple-500"
                        value={timeBasis}
                        onChange={(e) => setTimeBasis(e.target.value as TimeBasis)}
                     >
                        <option value="Monthly">Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                        <option value="YTD">Year-to-Date</option>
                        <option value="TTM">Trailing 12 Months</option>
                        <option value="Year">Fiscal Year</option>
                     </select>

                     {timeBasis === 'Year' ? (
                        <select 
                            className="border border-slate-300 rounded px-2 py-1.5 text-sm bg-white focus:ring-purple-500"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                        >
                            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                     ) : (
                        <input 
                            type="month"
                            className="border border-slate-300 rounded px-2 py-1.5 text-sm bg-white focus:ring-purple-500"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                     )}
                  </div>

                  <div className="flex items-center gap-2">
                      <Filter className="text-slate-400" size={18} />
                      <select 
                        className="border border-slate-300 rounded px-2 py-1.5 text-sm bg-white focus:ring-purple-500 min-w-[180px]"
                        value={entityFilter}
                        onChange={(e) => setEntityFilter(e.target.value)}
                      >
                          <option value="">Total Company</option>
                          <optgroup label="Product Lines">
                             {data.productLines.map(pl => <option key={pl.code} value={`PL|${pl.code}`}>{pl.name}</option>)}
                          </optgroup>
                          <optgroup label="Cost Centers">
                             {data.costCenters.map(cc => <option key={cc.code} value={`CC|${cc.code}`}>{cc.name}</option>)}
                          </optgroup>
                      </select>
                  </div>
              </div>

              <div className="text-right hidden xl:block">
                 <div className="text-sm font-bold text-slate-800">
                    {timeBasis} Performance 
                    <span className="font-normal text-slate-500 mx-1">
                        {timeBasis === 'Year' ? selectedYear : selectedDate}
                    </span>
                 </div>
                 <div className="text-xs text-slate-500">Actuals vs. Budget vs. PY</div>
              </div>
          </div>
       </Card>

       {/* P&L Table (Ends at EBIT) */}
       <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
             <div className="flex items-center gap-2 font-bold text-slate-700">
                Detailed Income Statement
             </div>
             <div className="text-xs text-slate-400 font-normal">Amounts in USD</div>
          </div>
          
          <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase">
                    <tr>
                        <th className="px-4 py-3 min-w-[300px]">Account</th>
                        <th className="px-4 py-3 text-right">Actual</th>
                        <th className="px-4 py-3 text-right hidden md:table-cell">Budget</th>
                        <th className="px-4 py-3 w-[180px] hidden sm:table-cell text-center">Variance</th>
                        <th className="px-4 py-3 text-right hidden md:table-cell">Var $</th>
                        <th className="px-4 py-3 text-right hidden lg:table-cell">Prior Year</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {buildCategorySection(AccountCategory.REVENUE, groupedAccounts[AccountCategory.REVENUE] || [])}
                    {buildCategorySection(AccountCategory.COGS, groupedAccounts[AccountCategory.COGS] || [], true)}
                    
                    {/* Gross Profit Summary */}
                    <tr className="bg-purple-50 border-y border-purple-100 font-bold text-purple-900">
                        <td className="px-4 py-2">Gross Profit</td>
                        <td className="px-4 py-2 text-right">{format(grossProfit.act)}</td>
                        <td className="px-4 py-2 text-right hidden md:table-cell">{format(grossProfit.bud)}</td>
                        <td className="hidden sm:table-cell"></td>
                        <td className="px-4 py-2 text-right hidden md:table-cell">{format(grossProfit.act - grossProfit.bud)}</td>
                        <td className="px-4 py-2 text-right hidden lg:table-cell">{format(grossProfit.py)}</td>
                    </tr>
                    
                    {buildCategorySection(AccountCategory.OPEX, groupedAccounts[AccountCategory.OPEX] || [], true)}
                    {buildCategorySection(AccountCategory.DEPRECIATION, groupedAccounts[AccountCategory.DEPRECIATION] || [], true)}
                    {buildCategorySection(AccountCategory.OTHER_INCOME, groupedAccounts[AccountCategory.OTHER_INCOME] || [])}

                    {/* EBIT Summary (End of Statement) */}
                    <tr className="bg-purple-100 border-t border-purple-200 font-bold text-purple-900">
                        <td className="px-4 py-2">Operating Profit (EBIT)</td>
                        <td className="px-4 py-2 text-right">{format(ebit.act)}</td>
                        <td className="px-4 py-2 text-right hidden md:table-cell">{format(ebit.bud)}</td>
                        <td className="hidden sm:table-cell"></td>
                        <td className="px-4 py-2 text-right hidden md:table-cell">{format(ebit.act - ebit.bud)}</td>
                        <td className="px-4 py-2 text-right hidden lg:table-cell">{format(ebit.py)}</td>
                    </tr>
                </tbody>
             </table>
          </div>
       </div>

       {/* FCF Walk Table */}
       <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 flex gap-2 items-center">
             Free Cash Flow Reconciliation
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase">
                    <tr>
                         <th className="px-4 py-3 min-w-[300px]">Item</th>
                         <th className="px-4 py-3 text-right">Actual</th>
                         <th className="px-4 py-3 text-right hidden md:table-cell">Budget</th>
                         <th className="px-4 py-3 w-[180px] hidden sm:table-cell text-center">Variance</th>
                         <th className="px-4 py-3 text-right hidden md:table-cell">Var $</th>
                         <th className="px-4 py-3 text-right hidden lg:table-cell">Prior Year</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {renderRow('Operating Profit (EBIT)', ebit.act, ebit.bud, ebit.py, 0, true)}
                    
                    {/* Collapsible Net Income Reconciliation */}
                    {renderRow(
                        'Adjustments to Net Income', 
                        -taxes.act, -taxes.bud, -taxes.py, 
                        0, false, false, false, 
                        () => toggleCat('NI_WALK'), 
                        true, expandedCats['NI_WALK']
                    )}
                    
                    {expandedCats['NI_WALK'] && (
                        <>
                             {renderRow('Less: Taxes', taxes.act, taxes.bud, taxes.py, 1, false, true)}
                             {/* Memo Row for Net Income */}
                             <tr className="bg-slate-50 text-slate-600 italic border-b border-slate-50">
                                <td className="px-4 py-2 flex items-center gap-2"><div style={{ width: 20 }} />Net Income (Memo)</td>
                                <td className="px-4 py-2 text-right font-mono">{format(netIncome.act)}</td>
                                <td className="px-4 py-2 text-right font-mono hidden md:table-cell">{format(netIncome.bud)}</td>
                                <td colSpan={3}></td>
                             </tr>
                        </>
                    )}
                    
                    {/* Cash Flow adjustments */}
                    {renderRow('Add Back: Depreciation', dep.act, dep.bud, dep.py, 0, false)}
                    
                    {/* Subtract Cash Flow Items (CapEx, WC) */}
                    {cfAccounts.map(acc => {
                        const a = getAmount(RecordType.ACTUAL, targetPeriods, acc.code);
                        const b = getAmount(RecordType.BUDGET, targetPeriods, acc.code);
                        const p = getAmount(RecordType.ACTUAL, pyPeriods, acc.code);
                        return renderRow(`Less: ${acc.name}`, a, b, p, 0, false, true);
                    })}

                    <tr className="bg-purple-50 border-t-2 border-purple-100 font-bold text-purple-900">
                        <td className="px-4 py-3">Free Cash Flow</td>
                        <td className="px-4 py-3 text-right">{format(fcf.act)}</td>
                        <td className="px-4 py-3 text-right hidden md:table-cell">{format(fcf.bud)}</td>
                        <td className="hidden sm:table-cell"></td>
                        <td className="px-4 py-3 text-right hidden md:table-cell">{format(fcf.act - fcf.bud)}</td>
                        <td className="px-4 py-3 text-right hidden lg:table-cell">{format(fcf.py)}</td>
                    </tr>
                </tbody>
            </table>
          </div>
       </div>

    </div>
  );
};