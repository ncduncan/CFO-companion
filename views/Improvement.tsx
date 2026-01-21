import React, { useState, useMemo } from 'react';
import { AppData, ImprovementOpportunity } from '../types';
import { Card } from '../components/ui/Card';
import { Plus, Trash2, Filter, X, ChevronDown, Check, LayoutGrid } from 'lucide-react';
import { SAAS_CATEGORIES } from '../services/financialModel';

interface ImprovementProps {
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
        className={`flex items-center justify-between gap-2 border rounded-md px-3 py-1.5 text-sm bg-white min-w-[180px] transition-colors ${
           selected.length > 0 ? 'border-purple-300 ring-1 ring-purple-100' : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <span className={`truncate ${selected.length > 0 ? 'text-purple-800 font-medium' : 'text-slate-600'}`}>
          {selected.length === 0 
            ? `All ${label}s` 
            : `${selected.length} ${label}${selected.length === 1 ? '' : 's'} Selected`}
        </span>
        <ChevronDown size={14} className="text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute top-full mt-1 left-0 w-64 bg-white border border-slate-200 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto py-1 animate-in fade-in zoom-in-95 duration-100">
            {options.length === 0 && (
               <div className="px-4 py-2 text-xs text-slate-400 italic">No options available</div>
            )}
            {options.map(option => (
              <div 
                key={option}
                onClick={() => toggleOption(option)}
                className="flex items-center px-3 py-2 hover:bg-slate-50 cursor-pointer select-none group"
              >
                <div className={`w-4 h-4 border rounded mr-3 flex items-center justify-center transition-colors ${
                  selected.includes(option) ? 'bg-purple-600 border-purple-600' : 'border-slate-300 group-hover:border-purple-400'
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

export const Improvement: React.FC<ImprovementProps> = ({ data, onUpdate }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newOpp, setNewOpp] = useState<Partial<ImprovementOpportunity>>({
    includedInBudget: false,
    impactAccountCode: '',
    impactProductLineCode: '',
    impactCostCenterCode: ''
  });

  // Filter State (Arrays for multi-select)
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);

  const STATUS_OPTIONS = ['Identified', 'In Progress', 'Completed', 'Discarded'];

  const uniqueOwners = useMemo(() => {
    const owners = data.opportunities.map(o => o.owner).filter(Boolean);
    return Array.from(new Set(owners)).sort();
  }, [data.opportunities]);

  const filteredOpportunities = useMemo(() => {
    return data.opportunities.filter(opp => {
      const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(opp.status);
      const matchesOwner = selectedOwners.length === 0 || selectedOwners.includes(opp.owner);
      return matchesStatus && matchesOwner;
    });
  }, [data.opportunities, selectedStatuses, selectedOwners]);

  const handleSave = () => {
    if (!newOpp.title || !newOpp.estimatedImpact) return;
    
    const opportunity: ImprovementOpportunity = {
      id: crypto.randomUUID(),
      title: newOpp.title,
      description: newOpp.description || '',
      estimatedImpact: Number(newOpp.estimatedImpact),
      status: 'Identified',
      owner: newOpp.owner || 'CFO',
      includedInBudget: newOpp.includedInBudget || false,
      estimatedImpactTiming: newOpp.estimatedImpactTiming || '',
      actionDueDate: newOpp.actionDueDate || '',
      impactAccountCode: newOpp.impactAccountCode,
      impactProductLineCode: newOpp.impactProductLineCode,
      impactCostCenterCode: newOpp.impactCostCenterCode
    };

    onUpdate({
      ...data,
      opportunities: [...data.opportunities, opportunity]
    });
    setIsAdding(false);
    setNewOpp({ includedInBudget: false, impactAccountCode: '', impactProductLineCode: '', impactCostCenterCode: '' });
  };

  const updateStatus = (id: string, status: ImprovementOpportunity['status']) => {
    const updated = data.opportunities.map(o => o.id === id ? { ...o, status } : o);
    onUpdate({ ...data, opportunities: updated });
  };

  const updateField = (id: string, field: keyof ImprovementOpportunity, value: any) => {
    const updated = data.opportunities.map(o => o.id === id ? { ...o, [field]: value } : o);
    onUpdate({ ...data, opportunities: updated });
  };
  
  // Handle Entity selection (Product vs Cost Center)
  const handleEntityChange = (id: string, value: string) => {
     let updates: Partial<ImprovementOpportunity> = {};
     if (!value) {
         updates = { impactProductLineCode: '', impactCostCenterCode: '' };
     } else if (value.startsWith('PL|')) {
         updates = { impactProductLineCode: value.split('|')[1], impactCostCenterCode: '' };
     } else if (value.startsWith('CC|')) {
         updates = { impactCostCenterCode: value.split('|')[1], impactProductLineCode: '' };
     }
     
     const updated = data.opportunities.map(o => o.id === id ? { ...o, ...updates } : o);
     onUpdate({ ...data, opportunities: updated });
  };

  // Helper for New Opportunity Form
  const handleNewEntityChange = (value: string) => {
      if (!value) {
          setNewOpp({ ...newOpp, impactProductLineCode: '', impactCostCenterCode: '' });
      } else if (value.startsWith('PL|')) {
          setNewOpp({ ...newOpp, impactProductLineCode: value.split('|')[1], impactCostCenterCode: '' });
      } else if (value.startsWith('CC|')) {
          setNewOpp({ ...newOpp, impactCostCenterCode: value.split('|')[1], impactProductLineCode: '' });
      }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this initiative?')) {
        const updated = data.opportunities.filter(o => o.id !== id);
        onUpdate({ ...data, opportunities: updated });
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-purple-100 text-purple-800';
      case 'Discarded': return 'bg-slate-100 text-slate-500';
      default: return 'bg-amber-100 text-amber-800';
    }
  };

  const renderAccountOptions = () => (
      <>
        {/* Enforce selection by not providing a default empty value that maps to 'General' */}
        <option value="" disabled>Select Sub-Account...</option>
        {SAAS_CATEGORIES.map(category => (
            <optgroup key={category} label={category}>
                {data.accounts.filter(a => a.category === category).map(acc => (
                    <option key={acc.code} value={acc.code}>
                        {acc.name}
                    </option>
                ))}
            </optgroup>
        ))}
      </>
  );

  const renderEntityOptions = () => (
      <>
        <option value="">-- No Specific Entity --</option>
        <optgroup label="Product Lines">
            {data.productLines.map(pl => (
                <option key={pl.code} value={`PL|${pl.code}`}>{pl.name}</option>
            ))}
        </optgroup>
        <optgroup label="Cost Centers">
            {data.costCenters.map(cc => (
                <option key={cc.code} value={`CC|${cc.code}`}>{cc.name}</option>
            ))}
        </optgroup>
      </>
  );

  const getEntityValue = (opp: Partial<ImprovementOpportunity>) => {
      if (opp.impactProductLineCode) return `PL|${opp.impactProductLineCode}`;
      if (opp.impactCostCenterCode) return `CC|${opp.impactCostCenterCode}`;
      return "";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
            <h2 className="text-xl font-bold text-slate-800">Improvement Initiatives</h2>
            <p className="text-sm text-slate-500">Track initiatives to improve margins and cash flow.</p>
         </div>
         <button 
           onClick={() => setIsAdding(!isAdding)}
           className="bg-gradient-to-r from-purple-700 to-purple-600 text-white px-4 py-2 rounded shadow hover:from-purple-800 hover:to-purple-700 flex items-center gap-2 transition-colors"
         >
           <Plus size={18} /> New Initiative
         </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-slate-600 mr-2">
          <Filter size={18} />
          <span className="font-medium text-sm">Filter:</span>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <FilterDropdown 
            label="Status"
            options={STATUS_OPTIONS}
            selected={selectedStatuses}
            onChange={setSelectedStatuses}
          />
          <FilterDropdown 
            label="Owner"
            options={uniqueOwners}
            selected={selectedOwners}
            onChange={setSelectedOwners}
          />
          {(selectedStatuses.length > 0 || selectedOwners.length > 0) && (
            <button 
              onClick={() => { setSelectedStatuses([]); setSelectedOwners([]); }}
              className="text-xs text-slate-500 hover:text-red-500 flex items-center gap-1 self-start sm:self-center mt-2 sm:mt-0 px-2"
            >
              <X size={14} /> Clear
            </button>
          )}
        </div>
        
        <div className="text-sm text-slate-400 w-full sm:w-auto text-right">
           Showing {filteredOpportunities.length} of {data.opportunities.length}
        </div>
      </div>

      {isAdding && (
        <Card title="New Initiative Details" className="border-purple-200 ring-2 ring-purple-50">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700">Title</label>
                <input 
                  className="w-full border rounded p-2 mt-1 focus:ring-purple-500"
                  placeholder="e.g., Vendor Consolidation"
                  value={newOpp.title || ''}
                  onChange={e => setNewOpp({...newOpp, title: e.target.value})}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700">Description</label>
                <textarea 
                  className="w-full border rounded p-2 mt-1 focus:ring-purple-500"
                  rows={3}
                  value={newOpp.description || ''}
                  onChange={e => setNewOpp({...newOpp, description: e.target.value})}
                />
              </div>
              
              <div className="col-span-2">
                 <label className="block text-sm font-medium text-slate-700 mb-1">Impact Account (Sub-Account)</label>
                 <select 
                    className="w-full border rounded p-2 bg-white focus:ring-purple-500"
                    value={newOpp.impactAccountCode || ''}
                    onChange={e => setNewOpp({...newOpp, impactAccountCode: e.target.value})}
                 >
                    {renderAccountOptions()}
                 </select>
              </div>

               <div className="col-span-2">
                 <label className="flex items-center justify-between text-sm font-medium text-slate-700 mb-1">
                    <span>Impact Entity (Product or Cost Center)</span>
                 </label>
                 <select 
                    className="w-full border rounded p-2 bg-white focus:ring-purple-500"
                    value={getEntityValue(newOpp)}
                    onChange={e => handleNewEntityChange(e.target.value)}
                 >
                    {renderEntityOptions()}
                 </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Est. Impact ($)</label>
                 <input 
                  type="number"
                  className="w-full border rounded p-2 mt-1 focus:ring-purple-500"
                  placeholder="0.00"
                  value={newOpp.estimatedImpact || ''}
                  onChange={e => setNewOpp({...newOpp, estimatedImpact: Number(e.target.value)})}
                />
              </div>
               <div>
                <label className="block text-sm font-medium text-slate-700">Owner</label>
                 <input 
                  className="w-full border rounded p-2 mt-1 focus:ring-purple-500"
                  placeholder="Name"
                  value={newOpp.owner || ''}
                  onChange={e => setNewOpp({...newOpp, owner: e.target.value})}
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-medium text-slate-700">Action Due Date</label>
                <input 
                  type="date"
                  className="w-full border rounded p-2 mt-1 focus:ring-purple-500"
                  value={newOpp.actionDueDate || ''}
                  onChange={e => setNewOpp({...newOpp, actionDueDate: e.target.value})}
                />
              </div>
               <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-medium text-slate-700">Impact Timing / Sequencing</label>
                <input 
                  type="text"
                  className="w-full border rounded p-2 mt-1 focus:ring-purple-500"
                  placeholder="e.g. Q3 Ramp Up"
                  value={newOpp.estimatedImpactTiming || ''}
                  onChange={e => setNewOpp({...newOpp, estimatedImpactTiming: e.target.value})}
                />
              </div>
              <div className="col-span-2 flex items-center gap-2 mt-2 p-3 bg-slate-50 rounded border border-slate-100">
                <input 
                  type="checkbox"
                  id="newIncluded"
                  className="w-5 h-5 text-purple-600 rounded cursor-pointer focus:ring-purple-500"
                  checked={newOpp.includedInBudget || false}
                  onChange={e => setNewOpp({...newOpp, includedInBudget: e.target.checked})}
                />
                <label htmlFor="newIncluded" className="text-sm text-slate-700 cursor-pointer">
                    <span className="font-semibold">Included in Baseline Budget?</span>
                    <span className="block text-xs text-slate-500">Checked = Assumed success in budget numbers. Unchecked = Upside opportunity on top of budget.</span>
                </label>
              </div>
           </div>
           <div className="mt-4 flex gap-2 justify-end">
             <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded transition-colors">Cancel</button>
             <button onClick={handleSave} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors">Save Initiative</button>
           </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4">
        {filteredOpportunities.length === 0 && !isAdding && (
          <div className="text-center py-12 bg-white rounded border border-dashed border-slate-300">
            <p className="text-slate-500">
               {data.opportunities.length === 0 
                  ? "No improvement initiatives tracked yet." 
                  : "No initiatives match your selected filters."}
            </p>
          </div>
        )}
        {filteredOpportunities.map(opp => (
          <Card key={opp.id} className="hover:shadow-md transition-shadow group">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                  <div className="flex-1 w-full">
                    
                    {/* Header Row */}
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                       <input 
                         className="flex-1 min-w-[200px] text-lg font-semibold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 focus:outline-none transition-colors px-1 -ml-1"
                         value={opp.title}
                         onChange={(e) => updateField(opp.id, 'title', e.target.value)}
                         placeholder="Initiative Title"
                       />
                       
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(opp.status)}`}>
                        {opp.status}
                      </span>
                      
                      {/* Budget Pill - Visual Indicator */}
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${opp.includedInBudget ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                        {opp.includedInBudget ? 'Baseline Budget' : 'Upside Opportunity'}
                      </span>
                    </div>

                    {/* Impact Tags Row */}
                    <div className="flex flex-wrap gap-2 mb-2 items-center">
                        <div className="relative group/sel min-w-[200px]">
                            <select 
                                className="text-xs border rounded bg-slate-50 text-slate-600 px-1 py-1 w-full appearance-none pr-6 focus:ring-1 focus:ring-purple-500 outline-none"
                                value={opp.impactAccountCode || ''}
                                onChange={(e) => updateField(opp.id, 'impactAccountCode', e.target.value)}
                            >
                                {renderAccountOptions()}
                            </select>
                            <ChevronDown size={12} className="absolute right-1 top-1.5 text-slate-400 pointer-events-none" />
                        </div>

                        {/* Combined Entity Dropdown */}
                        <div className="relative group/sel min-w-[200px]">
                            <LayoutGrid size={12} className="absolute left-1.5 top-1.5 text-slate-400 pointer-events-none" />
                            <select 
                                className="text-xs border rounded bg-slate-50 text-slate-600 pl-6 py-1 w-full appearance-none pr-6 focus:ring-1 focus:ring-purple-500 outline-none"
                                value={getEntityValue(opp)}
                                onChange={(e) => handleEntityChange(opp.id, e.target.value)}
                            >
                                {renderEntityOptions()}
                            </select>
                            <ChevronDown size={12} className="absolute right-1 top-1.5 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Description Editable */}
                    <textarea 
                      className="w-full text-slate-600 text-sm mb-3 bg-transparent border border-transparent hover:border-slate-200 focus:border-purple-500 rounded p-1 resize-none transition-all focus:bg-white"
                      rows={2}
                      value={opp.description}
                      onChange={(e) => updateField(opp.id, 'description', e.target.value)}
                      placeholder="Description..."
                    />
                    
                    {/* Editable Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-500 bg-slate-50 p-3 rounded border border-slate-100">
                        <div>
                          <span className="block text-slate-400 uppercase text-[10px] tracking-wider font-semibold mb-1">Est. Impact ($)</span>
                          <input
                            type="number"
                            value={opp.estimatedImpact}
                            onChange={(e) => updateField(opp.id, 'estimatedImpact', Number(e.target.value))}
                            className="bg-white border border-slate-200 rounded px-2 py-1 w-full text-slate-700 font-medium focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <span className="block text-slate-400 uppercase text-[10px] tracking-wider font-semibold mb-1">Owner</span>
                          <input
                            type="text"
                            value={opp.owner}
                            onChange={(e) => updateField(opp.id, 'owner', e.target.value)}
                            className="bg-white border border-slate-200 rounded px-2 py-1 w-full text-slate-700 focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <span className="block text-slate-400 uppercase text-[10px] tracking-wider font-semibold mb-1">Due Date</span>
                          <input 
                              type="date" 
                              value={opp.actionDueDate || ''} 
                              onChange={(e) => updateField(opp.id, 'actionDueDate', e.target.value)}
                              className="bg-white border border-slate-200 rounded px-2 py-1 w-full text-slate-700 focus:ring-1 focus:ring-purple-500"
                            />
                        </div>
                        <div>
                          <span className="block text-slate-400 uppercase text-[10px] tracking-wider font-semibold mb-1">Timing</span>
                          <input 
                            type="text"
                            value={opp.estimatedImpactTiming || ''}
                            onChange={(e) => updateField(opp.id, 'estimatedImpactTiming', e.target.value)}
                            className="bg-white border border-slate-200 rounded px-2 py-1 w-full text-slate-700 focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                    </div>
                  </div>
                  
                  {/* Status & Actions Column */}
                  <div className="flex flex-col gap-3 shrink-0 min-w-[140px] border-l border-slate-100 pl-4">
                    <div>
                        <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Status</label>
                        <select 
                        value={opp.status}
                        onChange={(e) => updateStatus(opp.id, e.target.value as any)}
                        className="w-full text-xs border border-slate-300 rounded p-1.5 bg-white shadow-sm focus:ring-purple-500"
                        >
                        <option value="Identified">Identified</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Discarded">Discarded</option>
                        </select>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                        <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer hover:bg-slate-50 p-1 rounded transition-colors">
                            <input 
                            type="checkbox" 
                            checked={opp.includedInBudget}
                            onChange={(e) => updateField(opp.id, 'includedInBudget', e.target.checked)}
                            className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                            />
                            <span>
                                Included in <br/>Baseline Budget
                            </span>
                        </label>
                    </div>

                    <div className="pt-2 mt-auto text-right">
                         <button 
                            onClick={() => handleDelete(opp.id)}
                            className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                            title="Delete Initiative"
                         >
                             <Trash2 size={16} />
                         </button>
                    </div>
                  </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};