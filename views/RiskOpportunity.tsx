import React, { useState, useMemo } from 'react';
import { AppData, RiskOpportunity } from '../types';
import { Card } from '../components/ui/Card';
import { Plus, Trash2, Filter, X, ChevronDown, Check, LayoutGrid, AlertTriangle, TrendingUp, Calendar } from 'lucide-react';
import { SAAS_CATEGORIES } from '../services/financialModel';

interface RiskOpportunityProps {
    data: AppData;
    onUpdate: (newData: AppData) => void;
}

// Helper Component for Multi-Select Dropdown
const FilterDropdown = ({
    label,
    options,
    selected,
    onChange
}: {
    label: string;
    options: string[];
    selected: string[];
    onChange: (newSelected: string[]) => void;
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleOption = (option: string) => {
        if (selected.includes(option)) {
            onChange(selected.filter(s => s !== option));
        } else {
            onChange([...selected, option]);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between gap-2 border rounded-md px-3 py-1.5 text-sm bg-white min-w-[150px] transition-colors ${selected.length > 0 ? 'border-purple-300 ring-1 ring-purple-100' : 'border-slate-300 hover:border-slate-400'
                    }`}
            >
                <span className={`truncate ${selected.length > 0 ? 'text-purple-800 font-medium' : 'text-slate-600'}`}>
                    {selected.length === 0
                        ? `All ${label}s`
                        : `${selected.length} ${label}`}
                </span>
                <ChevronDown size={14} className="text-slate-400 shrink-0" />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full mt-1 left-0 w-56 bg-white border border-slate-200 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto py-1 animate-in fade-in zoom-in-95 duration-100">
                        {options.map(option => (
                            <div
                                key={option}
                                onClick={() => toggleOption(option)}
                                className="flex items-center px-3 py-2 hover:bg-slate-50 cursor-pointer select-none group"
                            >
                                <div className={`w-4 h-4 border rounded mr-3 flex items-center justify-center transition-colors ${selected.includes(option) ? 'bg-purple-600 border-purple-600' : 'border-slate-300 group-hover:border-purple-400'
                                    }`}>
                                    {selected.includes(option) && <Check size={10} className="text-white" />}
                                </div>
                                <span className={`text-sm ${selected.includes(option) ? 'text-purple-900 font-medium' : 'text-slate-700'}`}>
                                    {option}
                                </span>
                            </div>
                        ))}
                        <div className="border-t border-slate-100 mt-1 pt-1 px-2 pb-1">
                            <button
                                onClick={() => { onChange([]); setIsOpen(false); }}
                                className="w-full text-xs text-slate-500 hover:text-slate-800 py-1 text-center"
                            >
                                Clear Selection
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export const RiskOpportunityView: React.FC<RiskOpportunityProps> = ({ data, onUpdate }) => {
    const [isAdding, setIsAdding] = useState(false);

    // Default new items to working plan
    const defaultPlanId = useMemo(() => {
        const working = data.plans.find(p => p.isWorkingPlan);
        return working ? working.id : (data.plans[0]?.id || '');
    }, [data.plans]);

    const [newRow, setNewRow] = useState<Partial<RiskOpportunity>>({
        type: 'Opportunity',
        includedInBudget: false,
        impactAccountCode: '',
        impactProductLineCode: '',
        impactCostCenterCode: '',
        durationMonths: 12,
        startDate: new Date().toISOString().slice(0, 7), // Current Month YYYY-MM
        planId: defaultPlanId
    });

    // Filter State
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [selectedPlans, setSelectedPlans] = useState<string[]>([]);

    const uniquePlans = useMemo(() => data.plans.map(p => p.name), [data.plans]);

    const filteredItems = useMemo(() => {
        return data.opportunities.filter(item => {
            const matchesType = selectedTypes.length === 0 || selectedTypes.includes(item.type);

            // Match Plan Name for filter (UI uses names, data uses ID)
            const planName = data.plans.find(p => p.id === item.planId)?.name || 'Unknown Plan';
            const matchesPlan = selectedPlans.length === 0 || selectedPlans.includes(planName);

            return matchesType && matchesPlan;
        });
    }, [data.opportunities, selectedTypes, selectedPlans, data.plans]);

    const handleSave = () => {
        if (!newRow.title || !newRow.estimatedImpact || !newRow.planId) {
            alert("Please provide Title, Impact Amount, and Plan.");
            return;
        }

        const item: RiskOpportunity = {
            id: crypto.randomUUID(),
            planId: newRow.planId,
            title: newRow.title,
            description: newRow.description || '',
            type: newRow.type || 'Opportunity',
            estimatedImpact: Number(newRow.estimatedImpact),
            status: 'Identified',
            owner: newRow.owner || 'CFO',
            includedInBudget: newRow.includedInBudget || false,
            startDate: newRow.startDate || new Date().toISOString().slice(0, 7),
            durationMonths: Number(newRow.durationMonths) || 12,
            actionDueDate: newRow.actionDueDate || '',
            estimatedImpactTiming: newRow.estimatedImpactTiming,
            impactAccountCode: newRow.impactAccountCode,
            impactProductLineCode: newRow.impactProductLineCode,
            impactCostCenterCode: newRow.impactCostCenterCode
        };

        onUpdate({
            ...data,
            opportunities: [...data.opportunities, item]
        });
        setIsAdding(false);
        // Reset but keep plan
        setNewRow({
            type: 'Opportunity',
            includedInBudget: false,
            impactAccountCode: '',
            impactProductLineCode: '',
            impactCostCenterCode: '',
            durationMonths: 12,
            startDate: new Date().toISOString().slice(0, 7),
            planId: defaultPlanId
        });
    };

    const updateField = (id: string, field: keyof RiskOpportunity, value: any) => {
        const updated = data.opportunities.map(o => o.id === id ? { ...o, [field]: value } : o);
        onUpdate({ ...data, opportunities: updated });
    };

    const handleDelete = (id: string) => {
        if (confirm('Delete this item?')) {
            const updated = data.opportunities.filter(o => o.id !== id);
            onUpdate({ ...data, opportunities: updated });
        }
    };

    const renderAccountOptions = () => (
        <>
            <option value="" disabled>Select Impact Account...</option>
            {SAAS_CATEGORIES.map(category => (
                <optgroup key={category} label={category}>
                    {data.accounts.filter(a => a.category === category).map(acc => (
                        <option key={acc.code} value={acc.code}>{acc.name}</option>
                    ))}
                </optgroup>
            ))}
        </>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <AlertTriangle className="text-amber-500" size={24} />
                        Risk & Opportunity Register
                    </h2>
                    <p className="text-sm text-slate-500">Manage upsides and downsides linked to your forecasts.</p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="bg-slate-800 text-white px-4 py-2 rounded-lg shadow hover:bg-slate-900 flex items-center gap-2 transition-colors"
                >
                    <Plus size={18} /> Add Risk / Op
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 text-slate-600 mr-2">
                    <Filter size={16} />
                    <span className="font-medium text-xs uppercase tracking-wide">Filter</span>
                </div>

                <FilterDropdown
                    label="Type"
                    options={['Risk', 'Opportunity']}
                    selected={selectedTypes}
                    onChange={setSelectedTypes}
                />
                <FilterDropdown
                    label="Plan"
                    options={uniquePlans}
                    selected={selectedPlans}
                    onChange={setSelectedPlans}
                />

                <div className="ml-auto text-xs text-slate-400">
                    {filteredItems.length} Items
                </div>
            </div>

            {isAdding && (
                <Card title="New Item" className="border-indigo-100 ring-4 ring-indigo-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        {/* Top Row: Type & Title */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Type</label>
                            <select
                                className="w-full border rounded p-2 text-sm focus:ring-indigo-500"
                                value={newRow.type}
                                onChange={e => setNewRow({ ...newRow, type: e.target.value as any })}
                            >
                                <option value="Opportunity">Opportunity (+)</option>
                                <option value="Risk">Risk (-)</option>
                            </select>
                        </div>
                        <div className="md:col-span-6">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Title</label>
                            <input
                                className="w-full border rounded p-2 text-sm focus:ring-indigo-500"
                                placeholder="e.g. Contract Renewal Delay"
                                value={newRow.title || ''}
                                onChange={e => setNewRow({ ...newRow, title: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-4">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Link to Plan</label>
                            <select
                                className="w-full border rounded p-2 text-sm bg-slate-50"
                                value={newRow.planId}
                                onChange={e => setNewRow({ ...newRow, planId: e.target.value })}
                            >
                                {data.plans.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} {p.isWorkingPlan ? '(Working)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Financial Impact Row */}
                        <div className="md:col-span-4">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Impact Account</label>
                            <select
                                className="w-full border rounded p-2 text-sm focus:ring-indigo-500"
                                value={newRow.impactAccountCode || ''}
                                onChange={e => setNewRow({ ...newRow, impactAccountCode: e.target.value })}
                            >
                                {renderAccountOptions()}
                            </select>
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Total Amount ($)</label>
                            <input
                                type="number"
                                className="w-full border rounded p-2 text-sm focus:ring-indigo-500"
                                placeholder="0.00"
                                value={newRow.estimatedImpact || ''}
                                onChange={e => setNewRow({ ...newRow, estimatedImpact: Number(e.target.value) })}
                            />
                        </div>

                        {/* Timing Row */}
                        <div className="md:col-span-3">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Start Period</label>
                            <input
                                type="month"
                                className="w-full border rounded p-2 text-sm focus:ring-indigo-500"
                                value={newRow.startDate || ''}
                                onChange={e => setNewRow({ ...newRow, startDate: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Duration (Mos)</label>
                            <input
                                type="number"
                                min="1"
                                className="w-full border rounded p-2 text-sm focus:ring-indigo-500"
                                value={newRow.durationMonths}
                                onChange={e => setNewRow({ ...newRow, durationMonths: parseInt(e.target.value) })}
                            />
                        </div>

                        {/* Description & Action */}
                        <div className="md:col-span-12">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Description</label>
                            <textarea
                                className="w-full border rounded p-2 text-sm focus:ring-indigo-500"
                                rows={2}
                                value={newRow.description || ''}
                                onChange={e => setNewRow({ ...newRow, description: e.target.value })}
                            />
                        </div>

                        <div className="md:col-span-12 flex justify-end gap-3 pt-2">
                            <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-500 hover:text-slate-800 text-sm">Cancel</button>
                            <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 text-sm font-medium">Save Item</button>
                        </div>
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-1 gap-3">
                {filteredItems.map(item => (
                    <div key={item.id} className={`group relative bg-white rounded-lg border shadow-sm transition-all hover:shadow-md ${item.type === 'Risk' ? 'border-l-4 border-l-red-400' : 'border-l-4 border-l-emerald-400'}`}>
                        <div className="p-4 flex flex-col md:flex-row gap-4">

                            {/* Main Info */}
                            <div className="flex-1 min-w-[300px]">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${item.type === 'Risk' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                        {item.type}
                                    </span>
                                    <input
                                        className="font-semibold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none flex-1"
                                        value={item.title}
                                        onChange={(e) => updateField(item.id, 'title', e.target.value)}
                                    />
                                </div>

                                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                                    <span>Plan: {data.plans.find(p => p.id === item.planId)?.name}</span>
                                    <span>•</span>
                                    <select
                                        className="bg-transparent hover:text-slate-800 cursor-pointer"
                                        value={item.impactAccountCode}
                                        onChange={(e) => updateField(item.id, 'impactAccountCode', e.target.value)}
                                    >
                                        {renderAccountOptions()}
                                    </select>
                                </div>

                                <textarea
                                    className="w-full text-sm text-slate-600 bg-transparent resize-none focus:bg-slate-50 rounded p-1 outline-none border border-transparent focus:border-indigo-200"
                                    rows={2}
                                    value={item.description}
                                    onChange={(e) => updateField(item.id, 'description', e.target.value)}
                                />
                            </div>

                            {/* Metrics */}
                            <div className="flex gap-4 md:border-l border-slate-100 md:pl-4 items-center">
                                <div className="w-24">
                                    <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Amount</label>
                                    <input
                                        type="number"
                                        value={item.estimatedImpact}
                                        onChange={(e) => updateField(item.id, 'estimatedImpact', Number(e.target.value))}
                                        className={`w-full text-sm font-bold bg-transparent border-b border-dashed border-slate-300 focus:border-indigo-500 text-right ${item.type === 'Risk' ? 'text-red-700' : 'text-emerald-700'}`}
                                    />
                                </div>

                                <div className="w-28 space-y-2">
                                    <div>
                                        <label className="text-[10px] uppercase text-slate-400 font-bold block">Start</label>
                                        <input
                                            type="month"
                                            value={item.startDate}
                                            onChange={(e) => updateField(item.id, 'startDate', e.target.value)}
                                            className="w-full text-xs bg-slate-50 rounded px-1 py-0.5"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            className="w-8 text-xs bg-slate-50 rounded text-center"
                                            value={item.durationMonths}
                                            onChange={(e) => updateField(item.id, 'durationMonths', Number(e.target.value))}
                                        />
                                        <span className="text-[10px] text-slate-400">Mos</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-2 border-l border-slate-100 pl-4 min-w-[120px]">
                                <label className={`flex items-center gap-2 text-xs p-1.5 rounded cursor-pointer transition-colors ${item.includedInBudget ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-500 hover:bg-slate-50'}`}>
                                    <input
                                        type="checkbox"
                                        checked={item.includedInBudget}
                                        onChange={(e) => updateField(item.id, 'includedInBudget', e.target.checked)}
                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                    />
                                    {item.includedInBudget ? 'In Forecast' : 'Exclude'}
                                </label>

                                <select
                                    value={item.status}
                                    onChange={(e) => updateField(item.id, 'status', e.target.value as any)}
                                    className="text-xs border border-slate-200 rounded p-1 bg-white"
                                >
                                    <option value="Identified">Identified</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Discarded">Discarded</option>
                                </select>

                                <button
                                    onClick={() => handleDelete(item.id)}
                                    className="mt-auto self-end text-slate-300 hover:text-red-500 p-1"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
