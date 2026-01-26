import React, { useState, useMemo } from 'react';
import {
  AppData,
  Plan,
  ForecastAssumption,
  DimensionMapping,
  RecordType,
  ForecastMethodType,
  FinancialRecord
} from '../types';
import { SAAS_CATEGORIES } from '../services/financialModel';
import { PROD_LINES, COST_CENTERS } from '../services/dataFactory';
import { generateForecast } from '../services/forecastingService';
import { Card } from '../components/ui/Card';
import {
  Plus,
  ChevronRight,
  Calendar,
  Target,
  TrendingUp,
  Calculator,
  Hash,
  Save,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface ForecastProps {
  data: AppData;
  onUpdate: (newData: AppData) => void;
}

export const Forecast: React.FC<ForecastProps> = ({ data, onUpdate }) => {
  // --- State ---
  const [activePlanId, setActivePlanId] = useState<string | null>(data.plans.length > 0 ? data.plans[0].id : null);
  const [selectedAccountCode, setSelectedAccountCode] = useState<string | null>(null);
  const [selectedProductLineCode, setSelectedProductLineCode] = useState<string>('All');
  const [selectedCostCenterCode, setSelectedCostCenterCode] = useState<string>('All');
  const [workbenchTab, setWorkbenchTab] = useState<'editor' | 'list'>('editor');

  // Forecast Configuration State (Draft)
  const [draftMethod, setDraftMethod] = useState<ForecastMethodType>('Trend');
  const [draftParams, setDraftParams] = useState<any>({});

  // --- Derived Data ---
  const activePlan = data.plans.find(p => p.id === activePlanId);
  const selectedAccount = data.accounts.find(a => a.code === selectedAccountCode);

  const completionStatus = useMemo(() => {
    if (!activePlanId) return 0;

    // Calculate total expected assumptions based on data model capabilities
    const revAccounts = data.accounts.filter(a => a.category === 'Revenue' || a.category === 'COGS').length;
    // Note: COGS usually follows Revenue/Product logic or Cost Center? Model says COGS_HOST (50000) -> PROD_LINES? 
    // In generateDummyRecords: COGS tracks Products. 
    // OpEx tracks Cost Centers.
    // Let's refine based on dataFactory usage.
    // Revenue + COGS -> Product Lines (5)
    // OpEx + Depreciation -> Cost Centers (6)
    // Tax/Other/FCF -> Global (1)

    // Hardcoded logic matching dataFactory generation for now
    const revCogsCount = data.accounts.filter(a => ['Revenue', 'COGS'].includes(a.category || '')).length;
    const opexCount = data.accounts.filter(a => ['OpEx', 'Depreciation'].includes(a.category || '')).length;
    const otherCount = data.accounts.filter(a => ['Taxes', 'Other Income', 'Cash Flow Items'].includes(a.category || '')).length;

    const totalExpected = (revCogsCount * PROD_LINES.length) + (opexCount * COST_CENTERS.length) + (otherCount * 1);
    const splitCount = data.assumptions.filter(a => a.planId === activePlanId).length;

    return totalExpected === 0 ? 0 : Math.min(100, Math.round((splitCount / totalExpected) * 100));
  }, [data.accounts, data.assumptions, activePlanId]);

  const existingAssumption = useMemo(() => {
    if (!activePlanId || !selectedAccountCode) return null;
    return data.assumptions.find(
      a => a.planId === activePlanId
        && a.accountCode === selectedAccountCode
        && (a.productLineCode === (selectedProductLineCode === 'All' ? undefined : selectedProductLineCode))
        && (a.costCenterCode === (selectedCostCenterCode === 'All' ? undefined : selectedCostCenterCode))
    );
  }, [data.assumptions, activePlanId, selectedAccountCode, selectedProductLineCode, selectedCostCenterCode]);

  // Load assumption into draft when selection changes
  // useEffect logic simplified: We just set initial state when selection changes or reset defaults
  React.useEffect(() => {
    if (existingAssumption) {
      setDraftMethod(existingAssumption.method);
      setDraftParams(existingAssumption.params);
    } else {
      setDraftMethod('Trend');
      setDraftParams({});
    }
  }, [existingAssumption, selectedAccountCode, activePlanId, selectedProductLineCode, selectedCostCenterCode]);

  // --- Handlers ---

  const handleCreatePlan = () => {
    const name = prompt("Enter Plan Name (e.g., '2026 Base Case'):");
    if (!name) return;
    const yearStr = prompt("Enter Plan Year (YYYY):", new Date().getFullYear().toString());
    const year = parseInt(yearStr || new Date().getFullYear().toString());

    const newPlan: Plan = {
      id: crypto.randomUUID(),
      name,
      description: 'User created plan',
      startDate: `${year}-01`,
      endDate: `${year}-12`,
      status: 'Draft',
      created: new Date().toISOString()
    };

    onUpdate({
      ...data,
      plans: [...data.plans, newPlan]
    });
    setActivePlanId(newPlan.id);
  };

  const handleDeletePlan = () => {
    if (!activePlanId) return;
    if (!window.confirm("Are you sure you want to delete this plan? This cannot be undone.")) return;

    // Remove plan and its assumptions/records
    const updatedPlans = data.plans.filter(p => p.id !== activePlanId);
    const updatedAssumptions = data.assumptions.filter(a => a.planId !== activePlanId);
    const updatedRecords = data.records.filter(r => r.planId !== activePlanId);

    onUpdate({
      ...data,
      plans: updatedPlans,
      assumptions: updatedAssumptions,
      records: updatedRecords
    });

    setActivePlanId(updatedPlans.length > 0 ? updatedPlans[0].id : null);
  };

  const handleCommitForecast = () => {
    if (!activePlanId || !selectedAccountCode || !activePlan) return;

    const newAssumption: ForecastAssumption = {
      id: existingAssumption?.id || crypto.randomUUID(),
      planId: activePlanId,
      accountCode: selectedAccountCode,
      productLineCode: selectedProductLineCode === 'All' ? undefined : selectedProductLineCode,
      costCenterCode: selectedCostCenterCode === 'All' ? undefined : selectedCostCenterCode,
      method: draftMethod,
      params: draftParams,
      lastUpdated: new Date().toISOString()
    };

    // 1. Generate Records
    // NOTE: generateForecast needs to support dimensions. 
    // For now we assume generateForecast filters based on assumption metadata if we pass it, 
    // BUT generateForecast signature in typical implementations might imply generating FOR the assumption.
    // We update generateForecast usage to respect these new fields if the service supports it.
    // If the service doesn't support explicit dimension passing in generateForecast logic, we might generate broad data.
    // However, looking at generateForecast it takes 'ForecastAssumption' which now has the dimensions. 
    // We need to ensure logic respects it.
    const newRecords = generateForecast(
      newAssumption,
      data,
      activePlan.startDate,
      activePlan.endDate
    );

    // 2. Clear old records for this intersection
    const cleanRecords = data.records.filter(r => {
      const matchPlan = r.planId === activePlanId;
      const matchAccount = r.accountCode === selectedAccountCode;
      // Strict match on dimensions for cleaning
      const pCode = selectedProductLineCode === 'All' ? 'GEN_PL' : selectedProductLineCode; // Default if All?
      // Actually 'All' means we might be forecasting for the aggregate or implicitly for all? 
      // If user selects 'All', we usually mean "Top Level" or "Aggregate". The dataFactory uses 'GEN_PL' or specific.
      // If user selects specific PL, we replace only THAT PL's data. 

      const rPl = r.productLineCode || '';
      const rCc = r.costCenterCode || '';
      const targetPl = selectedProductLineCode === 'All' ? undefined : selectedProductLineCode;
      const targetCc = selectedCostCenterCode === 'All' ? undefined : selectedCostCenterCode;

      // If target is undefined (All), do we clear ALL records for that account? 
      // Or do we only clear records that have NO dimension?
      // Design decision: If selecting "All" (Aggregate), we are likely forecasting at a high level which might override granular data?
      // OR "All" just means "No specific filter".
      // Let's assume for now we only support Specific Dimension forecasting OR Generic.
      // If User selects "All", we match records where productLineCode is missing or 'GEN_PL'.

      const matchPl = targetPl ? rPl === targetPl : true; // If target specific, must match. If All, match everything? careful.
      const matchCc = targetCc ? rCc === targetCc : true;

      // Better logic: strict equality for what we are replacing.
      // If newAssumption has productLineCode='PL_IOT', we remove records with 'PL_IOT'.
      // If newAssumption has productLineCode=undefined, we remove records with undefined/empty/GEN_PL?

      const assumptionPl = newAssumption.productLineCode;
      const assumptionCc = newAssumption.costCenterCode;

      const recordPlMatch = assumptionPl ? r.productLineCode === assumptionPl : (r.productLineCode === '' || r.productLineCode === 'GEN_PL');
      const recordCcMatch = assumptionCc ? r.costCenterCode === assumptionCc : (r.costCenterCode === '' || r.costCenterCode === 'GEN_CC');

      return !(matchPlan && matchAccount && recordPlMatch && recordCcMatch);
    });

    // 3. Update Data (Assumptions + Records)
    const updatedAssumptions = existingAssumption
      ? data.assumptions.map(a => a.id === existingAssumption.id ? newAssumption : a)
      : [...data.assumptions, newAssumption];

    onUpdate({
      ...data,
      records: [...cleanRecords, ...newRecords],
      assumptions: updatedAssumptions
    });
  };

  // --- Chart Data Preparation ---
  const chartData = useMemo(() => {
    if (!selectedAccountCode) return [];

    // Filter helpers
    const filterRecord = (r: FinancialRecord) => {
      if (r.accountCode !== selectedAccountCode) return false;

      // If a specific Product Line is selected, only show that. If 'All', show everything (aggregated).
      if (selectedProductLineCode !== 'All' && r.productLineCode !== selectedProductLineCode) return false;
      if (selectedCostCenterCode !== 'All' && r.costCenterCode !== selectedCostCenterCode) return false;

      return true;
    };

    // History (Actuals)
    const historyMap = new Map<string, number>();
    data.records
      .filter(r => r.type === RecordType.ACTUAL && filterRecord(r))
      .forEach(r => {
        historyMap.set(r.period, (historyMap.get(r.period) || 0) + r.amount);
      });

    // Forecast (Active Plan)
    const planMap = new Map<string, number>();
    if (activePlanId) {
      data.records
        .filter(r => r.planId === activePlanId && filterRecord(r))
        .forEach(r => {
          planMap.set(r.period, (planMap.get(r.period) || 0) + r.amount);
        });
    }

    // Preview
    const previewMap = new Map<string, number>();
    if (activePlanId && activePlan) {
      // Preview generation is tricky with dimensions if the service doesn't handle filtering.
      // We create a temp assumption with the CURRENT dimensions.
      const tempAssumption: ForecastAssumption = {
        id: 'temp',
        planId: activePlanId,
        accountCode: selectedAccountCode,
        productLineCode: selectedProductLineCode === 'All' ? undefined : selectedProductLineCode,
        costCenterCode: selectedCostCenterCode === 'All' ? undefined : selectedCostCenterCode,
        method: draftMethod,
        params: draftParams,
        lastUpdated: ''
      };
      // We need to assume generateForecast handles this.
      // Ideally generateForecast should return records for these dimensions.
      const previewRecords = generateForecast(tempAssumption, data, activePlan.startDate, activePlan.endDate);
      previewRecords.forEach(r => {
        previewMap.set(r.period, r.amount);
      });
    }

    // Merge all periods
    const allPeriods = Array.from(new Set([...historyMap.keys(), ...planMap.keys(), ...previewMap.keys()])).sort();

    return allPeriods.map(period => ({
      period,
      Actual: historyMap.get(period),
      Plan: planMap.get(period),
      Preview: previewMap.get(period)
    }));

  }, [data.records, selectedAccountCode, activePlanId, draftMethod, draftParams, selectedProductLineCode, selectedCostCenterCode]);

  // --- Render ---

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">

      {/* LEFT PANE: Planning Context */}
      <div className="w-64 flex flex-col gap-4">
        <Card className="flex flex-col gap-4 p-4 h-full">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Active Plan</label>
            <select
              value={activePlanId || ''}
              onChange={(e) => setActivePlanId(e.target.value)}
              className="w-full text-sm border-slate-200 rounded-md focus:ring-purple-500"
            >
              <option value="" disabled>Select a Plan...</option>
              {data.plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreatePlan}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-md text-sm font-medium transition-colors"
            >
              <Plus size={16} /> New Check
            </button>
            <button
              onClick={handleDeletePlan}
              title="Delete Current Plan"
              className="flex items-center justify-center px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-md transition-colors"
            >
              <div className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center font-bold text-[10px] leading-none">x</div>
            </button>
          </div>

          <div className="mt-auto border-t pt-4">
            <div className="text-xs text-slate-400 mb-2">Completion Status</div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-purple-500 h-2 rounded-full transition-all duration-500" style={{ width: `${completionStatus}%` }}></div>
            </div>
            <div className="text-right text-[10px] text-slate-400 mt-1">{completionStatus}% Forecasted</div>
            {/* Progress logic to be implemented later */}
          </div>
        </Card>
      </div>

      {/* MIDDLE PANE: Account Navigation */}
      <div className="w-80 flex flex-col gap-4">
        <Card className="flex-1 overflow-y-auto p-0">
          <div className="p-4 border-b bg-slate-50 sticky top-0">
            <h3 className="font-semibold text-slate-700">Accounts</h3>
          </div>
          <div className="p-2">
            {SAAS_CATEGORIES.map(category => (
              <div key={category} className="mb-4">
                <div className="px-2 py-1 text-xs font-bold text-slate-400 uppercase">{category}</div>
                {data.accounts.filter(a => a.category === category).map(account => {
                  const isPlanned = data.assumptions.some(asm => asm.planId === activePlanId && asm.accountCode === account.code);
                  return (
                    <button
                      key={account.code}
                      onClick={() => setSelectedAccountCode(account.code)}
                      className={`w-full text-left px-3 py-2 rounded-md flex items-center justify-between group transition-colors ${selectedAccountCode === account.code
                        ? 'bg-purple-50 text-purple-700 font-medium'
                        : 'hover:bg-slate-50 text-slate-600'
                        }`}
                    >
                      <span className="truncate">{account.name}</span>
                      {isPlanned ? (
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-slate-200 group-hover:bg-slate-300" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* RIGHT PANE: Workbench */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedAccount || !activePlan ? (
          <Card className="h-full flex items-center justify-center text-slate-400">
            <div className="text-center">
              <Target size={48} className="mx-auto mb-4 opacity-50" />
              <p>Select a Plan and an Account to begin forecasting</p>
            </div>
          </Card>
        ) : (
          <div className="flex flex-col h-full gap-6">

            {/* Top: Visualization */}
            <Card className="h-[400px] flex flex-col">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="font-bold text-lg text-slate-800">{selectedAccount.name} <span className="text-slate-400 font-normal">History & Forecast</span></h3>
                <div className="flex gap-2">
                  <select
                    value={selectedProductLineCode}
                    onChange={e => setSelectedProductLineCode(e.target.value)}
                    className="text-xs border-slate-200 rounded-md py-1"
                  >
                    <option value="All">All Products</option>
                    {PROD_LINES.map(pl => <option key={pl.code} value={pl.code}>{pl.name}</option>)}
                  </select>
                  <select
                    value={selectedCostCenterCode}
                    onChange={e => setSelectedCostCenterCode(e.target.value)}
                    className="text-xs border-slate-200 rounded-md py-1"
                  >
                    <option value="All">All Cost Centers</option>
                    {COST_CENTERS.map(cc => <option key={cc.code} value={cc.code}>{cc.name}</option>)}
                  </select>
                </div>

              </div>
              <div className="flex-1 min-h-0 relative">
                {chartData.reduce((sum, item) => sum + (item.Actual || 0), 0) === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10 backdrop-blur-sm">
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md shadow-sm flex items-center gap-2">
                      <AlertCircle size={20} />
                      <p className="text-sm font-medium">No historical data available for this account.</p>
                    </div>
                  </div>
                )}
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="period" hide />
                    <YAxis />
                    <Tooltip
                      formatter={(val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="Actual" fill="#f1f5f9" stroke="#94a3b8" />
                    <Line type="monotone" dataKey="Plan" stroke="#7e22ce" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Preview" stroke="#f472b6" strokeDasharray="5 5" dot={false} strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Bottom: Workbench (Editor & Assumptions) */}
            <Card className="flex-1 flex flex-col p-0 overflow-hidden">
              <div className="flex border-b bg-slate-50">
                <button
                  onClick={() => setWorkbenchTab('editor')}
                  className={`px-4 py-3 text-sm font-medium transition-colors ${workbenchTab === 'editor' ? 'text-purple-700 border-b-2 border-purple-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Forecast Editor
                </button>
                <button
                  onClick={() => setWorkbenchTab('list')}
                  className={`px-4 py-3 text-sm font-medium transition-colors ${workbenchTab === 'list' ? 'text-purple-700 border-b-2 border-purple-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  All Assumptions ({data.assumptions.filter(a => a.planId === activePlanId).length})
                </button>
              </div>

              {workbenchTab === 'editor' && (
                <>
                  <div className="flex border-b">
                    {(['Trend', 'GrowthYearOverYear', 'PercentOfRevenue', 'Manual'] as ForecastMethodType[]).map(m => (
                      <button
                        key={m}
                        onClick={() => setDraftMethod(m)}
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${draftMethod === m
                          ? 'border-purple-600 text-purple-700 bg-purple-50/50'
                          : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                          }`}
                      >
                        {m.replace(/([A-Z])/g, ' $1').trim()}
                      </button>
                    ))}
                  </div>

                  <div className="p-6 flex-1 bg-slate-50/20 overflow-y-auto">
                    <div className="max-w-lg space-y-6">
                      {draftMethod === 'GrowthYearOverYear' && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Annual Growth Rate %</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.01"
                              value={(draftParams.growthRate || 0) * 100}
                              onChange={(e) => setDraftParams({ ...draftParams, growthRate: Number(e.target.value) / 100 })}
                              className="border rounded-md p-2 w-32"
                            />
                            <span className="text-slate-500 text-sm">%</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-2">Projects next year by applying this growth rate to the same month last year.</p>
                        </div>
                      )}

                      {draftMethod === 'PercentOfRevenue' && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">% of Total Revenue</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.1"
                              value={(draftParams.percentOfRevenue || 0) * 100}
                              onChange={(e) => setDraftParams({ ...draftParams, percentOfRevenue: Number(e.target.value) / 100 })}
                              className="border rounded-md p-2 w-32"
                            />
                            <span className="text-slate-500 text-sm">%</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-2">Calculates amount as a percentage of Total Revenue (REV_*) for the period.</p>
                        </div>
                      )}

                      {draftMethod === 'Manual' && activePlan && (
                        <div className="space-y-4">
                          <p className="text-sm text-slate-500">Enter monthly values directly.</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {Array.from({ length: 12 }, (_, i) => {
                              const yr = parseInt(activePlan.startDate.split('-')[0]);
                              const mn = i + 1;
                              const period = `${yr}-${mn.toString().padStart(2, '0')}`;
                              const val = draftParams.manualValues?.[period] ?? 0;
                              return (
                                <div key={period}>
                                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                                    {new Date(period + '-01').toLocaleString('default', { month: 'short', year: 'numeric' })}
                                  </label>
                                  <input
                                    type="number"
                                    value={val}
                                    onChange={(e) => {
                                      const newVal = Number(e.target.value);
                                      setDraftParams((prev: any) => ({
                                        ...prev,
                                        manualValues: { ...(prev.manualValues || {}), [period]: newVal }
                                      }));
                                    }}
                                    className="w-full text-sm border-slate-200 rounded-md focus:ring-purple-500 p-2"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {draftMethod === 'Trend' && (
                        <div className="flex items-start gap-3 p-4 bg-blue-50 text-blue-700 rounded-md">
                          <TrendingUp size={20} className="mt-0.5" />
                          <div>
                            <p className="font-semibold text-sm">Automated Trend Analysis</p>
                            <p className="text-xs opacity-80 mt-1">
                              We analyze your historical actuals using linear regression to project the future trend automatically.
                              No configuration needed.
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="pt-4 border-t flex justify-end">
                        <button
                          onClick={handleCommitForecast}
                          className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2.5 rounded-lg hover:bg-purple-700 shadow-sm transition-all active:scale-95"
                        >
                          <Save size={18} />
                          Commit to Plan
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {workbenchTab === 'list' && (
                <div className="flex-1 overflow-auto bg-white">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-2">Account</th>
                        <th className="px-4 py-2">Product Line</th>
                        <th className="px-4 py-2">Cost Center</th>
                        <th className="px-4 py-2">Method</th>
                        <th className="px-4 py-2">Details</th>
                        <th className="px-4 py-2">Last Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.assumptions.filter(a => a.planId === activePlanId).length === 0 ? (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No assumptions modeled yet.</td></tr>
                      ) : (
                        data.assumptions.filter(a => a.planId === activePlanId).map(asm => {
                          const accName = data.accounts.find(x => x.code === asm.accountCode)?.name || asm.accountCode;
                          const plName = asm.productLineCode ? PROD_LINES.find(x => x.code === asm.productLineCode)?.name : 'All';
                          const ccName = asm.costCenterCode ? COST_CENTERS.find(x => x.code === asm.costCenterCode)?.name : 'All';
                          return (
                            <tr key={asm.id} className="hover:bg-slate-50">
                              <td className="px-4 py-2 font-medium">{accName}</td>
                              <td className="px-4 py-2 text-slate-500">{plName}</td>
                              <td className="px-4 py-2 text-slate-500">{ccName}</td>
                              <td className="px-4 py-2 text-purple-600">{asm.method}</td>
                              <td className="px-4 py-2 text-slate-400 text-xs truncate max-w-[200px]">{JSON.stringify(asm.params)}</td>
                              <td className="px-4 py-2 text-slate-400 text-xs">{new Date(asm.lastUpdated).toLocaleDateString()}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};