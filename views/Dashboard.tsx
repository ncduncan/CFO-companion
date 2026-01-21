import React, { useMemo } from 'react';
import { AppData, RecordType } from '../types';
import { Card } from '../components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { calculatePnL } from '../services/financialModel';

interface DashboardProps {
  data: AppData;
}

export const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  
  const metrics = useMemo(() => {
    // We pass the full accounts list to the PnL calculator now
    const budgetPnl = calculatePnL(data.records, data.accounts, RecordType.BUDGET);
    const actualPnl = calculatePnL(data.records, data.accounts, RecordType.ACTUAL);
    
    const kpiData = [
       { label: 'Revenue', budget: budgetPnl.revenue, actual: actualPnl.revenue, format: 'currency' },
       { label: 'Gross Profit', budget: budgetPnl.grossProfit, actual: actualPnl.grossProfit, format: 'currency' },
       { label: 'EBITDA', budget: budgetPnl.ebitda, actual: actualPnl.ebitda, format: 'currency' },
       { label: 'Free Cash Flow', budget: budgetPnl.fcf, actual: actualPnl.fcf, format: 'currency' },
    ];
    
    // Aggregation for charts
    const periods = Array.from(new Set(data.records.map(r => r.period))).sort();
    const chartData = periods.map(p => {
        const periodRecords = data.records.filter(r => r.period === p);
        const b = calculatePnL(periodRecords, data.accounts, RecordType.BUDGET);
        const a = calculatePnL(periodRecords, data.accounts, RecordType.ACTUAL);
        return {
            period: p,
            'Act Rev': a.revenue,
            'Bud Rev': b.revenue,
            'Act EBITDA': a.ebitda,
            'Bud EBITDA': b.ebitda
        };
    });

    return { kpiData, chartData, budgetPnl, actualPnl };
  }, [data.records, data.accounts]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {metrics.kpiData.map((kpi, idx) => {
            const variance = kpi.actual - kpi.budget;
            const isPositiveGood = kpi.label !== 'OpEx';
            const isGood = isPositiveGood ? variance >= 0 : variance <= 0;
            
            return (
                <Card key={idx} className={`border-t-4 ${isGood ? 'border-t-emerald-500' : 'border-t-rose-500'}`}>
                    <div className="text-sm text-slate-500 font-medium uppercase tracking-wider">{kpi.label}</div>
                    <div className="mt-2 flex justify-between items-baseline">
                        <div className="text-2xl font-bold text-slate-800">{formatCurrency(kpi.actual)}</div>
                        <div className="text-xs text-slate-400">Act</div>
                    </div>
                    <div className="mt-1 flex justify-between items-baseline border-t border-slate-100 pt-1">
                        <div className="text-sm text-slate-600">{formatCurrency(kpi.budget)}</div>
                        <div className="text-xs text-slate-400">Bud</div>
                    </div>
                </Card>
            );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Revenue Trend">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="Act Rev" fill="#7e22ce" name="Actual Revenue" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Bud Rev" fill="#cbd5e1" name="Budget Revenue" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="EBITDA Performance">
          <div className="h-72 w-full">
             <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.chartData}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="Act EBITDA" stroke="#7e22ce" strokeWidth={2} name="Actual EBITDA" />
                <Line type="monotone" dataKey="Bud EBITDA" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="Budget EBITDA" />
              </LineChart>
             </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};