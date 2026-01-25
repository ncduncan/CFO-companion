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

  // Forecast Configuration State (Draft)
  const [draftMethod, setDraftMethod] = useState<ForecastMethodType>('Trend');
  const [draftParams, setDraftParams] = useState<any>({});

  // --- Derived Data ---
  const activePlan = data.plans.find(p => p.id === activePlanId);
  const selectedAccount = data.accounts.find(a => a.code === selectedAccountCode);

  const existingAssumption = useMemo(() => {
    if (!activePlanId || !selectedAccountCode) return null;
    return data.assumptions.find(
      a => a.planId === activePlanId && a.accountCode === selectedAccountCode
    );
  }, [data.assumptions, activePlanId, selectedAccountCode]);

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
  }, [existingAssumption, selectedAccountCode, activePlanId]);

  // --- Handlers ---

  const handleCreatePlan = () => {
    const name = prompt("Enter Plan Name (e.g., '2025 Base Case'):");
    if (!name) return;

    const newPlan: Plan = {
      id: crypto.randomUUID(),
      name,
      description: 'User created plan',
      startDate: '2024-01', // Defaulting for now
      endDate: '2024-12',
      status: 'Draft',
      created: new Date().toISOString()
    };

    onUpdate({
      ...data,
      plans: [...data.plans, newPlan]
    });
    setActivePlanId(newPlan.id);
  };

  const handleCommitForecast = () => {
    if (!activePlanId || !selectedAccountCode || !activePlan) return;

    const newAssumption: ForecastAssumption = {
      id: existingAssumption?.id || crypto.randomUUID(),
      planId: activePlanId,
      accountCode: selectedAccountCode,
      productLineCode: '', // Simplified: Global/Aggregate Level forecasting for Phase 1
      costCenterCode: '',
      method: draftMethod,
      params: draftParams,
      lastUpdated: new Date().toISOString()
    };

    // 1. Generate Records
    const newRecords = generateForecast(
      newAssumption,
      data,
      activePlan.startDate,
      activePlan.endDate
    );

    // 2. Clear old records for this plan/account intersection
    const cleanRecords = data.records.filter(r =>
      !(r.planId === activePlanId && r.accountCode === selectedAccountCode)
    );

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

    // History (Actuals)
    const historyMap = new Map<string, number>();
    data.records
      .filter(r => r.type === RecordType.ACTUAL && r.accountCode === selectedAccountCode)
      .forEach(r => {
        historyMap.set(r.period, (historyMap.get(r.period) || 0) + r.amount);
      });

    // Forecast (Active Plan) - if committed
    const planMap = new Map<string, number>();
    if (activePlanId) {
      data.records
        .filter(r => r.planId === activePlanId && r.accountCode === selectedAccountCode)
        .forEach(r => {
          planMap.set(r.period, (planMap.get(r.period) || 0) + r.amount);
        });
    }

    // Preview (Live Calculation based on Draft)
    // If we have a valid plan selected, run the generator on the fly
    const previewMap = new Map<string, number>();
    if (activePlanId && activePlan) {
      const tempAssumption: ForecastAssumption = {
        id: 'temp',
        planId: activePlanId,
        accountCode: selectedAccountCode,
        method: draftMethod,
        params: draftParams,
        lastUpdated: ''
      };
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
      Preview: previewMap.get(period) // Might overlap with Plan if committed, but useful for 'what-if'
    }));

  }, [data.records, selectedAccountCode, activePlanId, draftMethod, draftParams]);

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

          <button
            onClick={handleCreatePlan}
            className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <Plus size={16} /> New Scenario
          </button>

          <div className="mt-auto border-t pt-4">
            <div className="text-xs text-slate-400 mb-2">Completion Status</div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-purple-500 h-2 rounded-full" style={{ width: '0%' }}></div>
            </div>
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
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-slate-800">{selectedAccount.name} <span className="text-slate-400 font-normal">History & Forecast</span></h3>
                <div className="flex gap-2">
                  {/* Placeholder for View Options (Monthly/Quarterly) */}
                </div>
              </div>
              <div className="flex-1 min-h-0">
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

            {/* Bottom: Method Configuration */}
            <Card className="flex-1 flex flex-col p-0 overflow-hidden">
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

              <div className="p-6 flex-1 bg-slate-50/20">
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
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};