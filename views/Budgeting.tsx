import React, { useState } from 'react';
import { AppData, FinancialRecord, RecordType } from '../types';
import { Card } from '../components/ui/Card';
import { Plus, Trash2 } from 'lucide-react';
import { SAAS_CATEGORIES } from '../services/financialModel';

interface BudgetingProps {
  data: AppData;
  onUpdate: (newData: AppData) => void;
}

export const Budgeting: React.FC<BudgetingProps> = ({ data, onUpdate }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>(new Date().toISOString().slice(0, 7));

  // Filter records for the view
  const currentRecords = data.records.filter(
    r => r.type === RecordType.BUDGET && r.period === selectedPeriod
  );

  const handleAddRow = () => {
    const newRecord: FinancialRecord = {
      id: crypto.randomUUID(),
      period: selectedPeriod,
      type: RecordType.BUDGET,
      accountCode: data.accounts[0]?.code || '',
      costCenterCode: data.costCenters[0]?.code || '',
      productLineCode: data.productLines[0]?.code || '',
      amount: 0
    };
    
    onUpdate({
      ...data,
      records: [...data.records, newRecord]
    });
  };

  const handleUpdateRow = (id: string, field: keyof FinancialRecord, value: any) => {
    const updatedRecords = data.records.map(r => {
      if (r.id === id) {
        return { ...r, [field]: field === 'amount' ? Number(value) : value };
      }
      return r;
    });
    onUpdate({ ...data, records: updatedRecords });
  };

  const handleDeleteRow = (id: string) => {
    onUpdate({
      ...data,
      records: data.records.filter(r => r.id !== id)
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex items-center gap-4">
             <label className="font-semibold text-slate-700">Budget Period:</label>
             <input 
                type="month" 
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="border rounded p-2 text-slate-800 focus:ring-1 focus:ring-purple-500"
             />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleAddRow}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition shadow-sm"
            >
              <Plus size={16} /> Add Entry
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border rounded-lg border-slate-200">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 min-w-[200px]">Account</th>
                <th className="px-4 py-3 min-w-[150px]">Cost Center</th>
                <th className="px-4 py-3 min-w-[150px]">Product Line</th>
                <th className="px-4 py-3 text-right">Amount ($)</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No budget entries for this period. Click "Add Entry" to begin.
                  </td>
                </tr>
              ) : (
                currentRecords.map((record) => (
                  <tr key={record.id} className="border-b hover:bg-purple-50/20 transition-colors">
                    <td className="px-4 py-2">
                      <select 
                        value={record.accountCode}
                        onChange={(e) => handleUpdateRow(record.id, 'accountCode', e.target.value)}
                        className="w-full border-none bg-transparent focus:ring-1 focus:ring-purple-500 rounded px-1"
                      >
                         {SAAS_CATEGORIES.map(category => (
                            <optgroup key={category} label={category}>
                                {data.accounts.filter(a => a.category === category).map(acc => (
                                    <option key={acc.code} value={acc.code}>{acc.name}</option>
                                ))}
                            </optgroup>
                         ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <select 
                        value={record.costCenterCode}
                        onChange={(e) => handleUpdateRow(record.id, 'costCenterCode', e.target.value)}
                        className="w-full border-none bg-transparent focus:ring-1 focus:ring-purple-500 rounded px-1"
                      >
                        {data.costCenters.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <select 
                        value={record.productLineCode}
                        onChange={(e) => handleUpdateRow(record.id, 'productLineCode', e.target.value)}
                        className="w-full border-none bg-transparent focus:ring-1 focus:ring-purple-500 rounded px-1"
                      >
                        {data.productLines.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input 
                        type="number"
                        value={record.amount}
                        onChange={(e) => handleUpdateRow(record.id, 'amount', e.target.value)}
                        className="w-full text-right border-slate-200 rounded p-1 focus:border-purple-500"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button 
                        onClick={() => handleDeleteRow(record.id)}
                        className="text-slate-400 hover:text-red-700 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-50 font-semibold text-slate-800 border-t border-slate-200">
               <tr>
                <td colSpan={3} className="px-4 py-3 text-right">Total:</td>
                <td className="px-4 py-3 text-right text-purple-800">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                    currentRecords.reduce((sum, r) => sum + r.amount, 0)
                  )}
                </td>
                <td></td>
               </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
};