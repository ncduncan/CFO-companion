import React, { useState } from 'react';
import { AppData, DimensionMapping } from '../types';
import { Card } from '../components/ui/Card';
import { FolderOpen, AlertTriangle, CheckCircle, AlertCircle, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { SAAS_CATEGORIES } from '../services/financialModel';

interface SettingsProps {
  data: AppData;
  onUpdate: (newData: AppData) => void;
  onSelectFolder: () => void;
  folderName: string | null;
}

export const Settings: React.FC<SettingsProps> = ({ data, onUpdate, onSelectFolder, folderName }) => {
  const [activeTab, setActiveTab] = useState<'mappings' | 'data'>('mappings');

  const updateMapping = (
    type: 'accounts' | 'costCenters' | 'productLines',
    index: number,
    field: keyof DimensionMapping,
    value: string
  ) => {
    const newList = [...data[type]];
    newList[index] = { ...newList[index], [field]: value };
    onUpdate({ ...data, [type]: newList });
  };

  const addMapping = (type: 'costCenters' | 'productLines') => {
    const internalCode = `GEN_${Date.now()}`;
    const newList = [...data[type], { code: internalCode, name: 'New Item', hyperionMap: '' }];
    onUpdate({ ...data, [type]: newList });
  };
  
  const removeMapping = (type: 'costCenters' | 'productLines', index: number) => {
     const newList = [...data[type]];
     newList.splice(index, 1);
     onUpdate({...data, [type]: newList});
  };

  const moveMapping = (type: 'costCenters' | 'productLines', index: number, direction: 'up' | 'down') => {
    const list = [...data[type]];
    if (direction === 'up' && index > 0) {
      [list[index], list[index - 1]] = [list[index - 1], list[index]];
    } else if (direction === 'down' && index < list.length - 1) {
      [list[index], list[index + 1]] = [list[index + 1], list[index]];
    }
    onUpdate({ ...data, [type]: list });
  };

  // Account specific logic
  const addAccount = (category: string) => {
    const internalCode = `ACC_${Date.now()}`;
    const newAccount: DimensionMapping = { 
        code: internalCode, 
        name: 'New Account', 
        hyperionMap: '', 
        category: category 
    };
    onUpdate({ ...data, accounts: [...data.accounts, newAccount] });
  };

  const removeAccount = (code: string) => {
    onUpdate({ ...data, accounts: data.accounts.filter(a => a.code !== code) });
  };

  const updateAccount = (code: string, field: keyof DimensionMapping, value: string) => {
    const updated = data.accounts.map(a => a.code === code ? { ...a, [field]: value } : a);
    onUpdate({ ...data, accounts: updated });
  };

  const moveAccount = (category: string, code: string, direction: 'up' | 'down') => {
    // 1. Isolate accounts for this category
    const categoryAccounts = data.accounts.filter(a => a.category === category);
    // 2. Find index in the subset
    const index = categoryAccounts.findIndex(a => a.code === code);
    
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === categoryAccounts.length - 1) return;

    // 3. Swap in subset
    const newCategoryAccounts = [...categoryAccounts];
    if (direction === 'up') {
        [newCategoryAccounts[index], newCategoryAccounts[index - 1]] = [newCategoryAccounts[index - 1], newCategoryAccounts[index]];
    } else {
        [newCategoryAccounts[index], newCategoryAccounts[index + 1]] = [newCategoryAccounts[index + 1], newCategoryAccounts[index]];
    }

    // 4. Reconstruct global list (Other categories + New Category Order)
    // Note: This gathers all items of this category together in the file, which is fine.
    const otherAccounts = data.accounts.filter(a => a.category !== category);
    
    // We want to insert the reordered category block roughly where it was, or just append?
    // Since we display by iterating categories, physical order in the JSON only matters for the specific category subset.
    // Appending is safest and easiest.
    onUpdate({ ...data, accounts: [...otherAccounts, ...newCategoryAccounts] });
  };

  const renderFlexibleTable = (title: string, type: 'costCenters' | 'productLines') => (
    <Card title={title} className="mb-6 shadow-md border-slate-200">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-4 py-2 w-10">#</th>
              <th className="px-4 py-2 w-1/2">Name</th>
              <th className="px-4 py-2 w-1/3">Hyperion Mapping</th>
              <th className="px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data[type].map((item, idx) => (
              <tr key={idx} className="border-b last:border-0 hover:bg-purple-50/30 transition-colors group">
                <td className="px-4 py-2 text-slate-400 font-mono text-xs">
                  {idx + 1}
                </td>
                <td className="p-2">
                  <input 
                    className="w-full border border-slate-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                    value={item.name}
                    onChange={(e) => updateMapping(type, idx, 'name', e.target.value)}
                  />
                </td>
                <td className="p-2">
                  <input 
                    className="w-full border border-slate-300 rounded px-2 py-1.5 bg-yellow-50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-mono text-xs"
                    value={item.hyperionMap}
                    placeholder="e.g. CC_100"
                    onChange={(e) => updateMapping(type, idx, 'hyperionMap', e.target.value)}
                  />
                </td>
                <td className="p-2">
                    <div className="flex items-center justify-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={() => moveMapping(type, idx, 'up')} 
                            disabled={idx === 0}
                            className="p-1 text-slate-400 hover:text-purple-600 disabled:opacity-30 hover:bg-purple-50 rounded"
                        >
                            <ArrowUp size={16} />
                        </button>
                        <button 
                            onClick={() => moveMapping(type, idx, 'down')}
                            disabled={idx === data[type].length - 1}
                            className="p-1 text-slate-400 hover:text-purple-600 disabled:opacity-30 hover:bg-purple-50 rounded"
                        >
                            <ArrowDown size={16} />
                        </button>
                        <div className="w-px h-4 bg-slate-300 mx-1"></div>
                        <button 
                            onClick={() => removeMapping(type, idx)} 
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <button 
            onClick={() => addMapping(type)}
            className="text-sm text-purple-700 hover:text-purple-900 font-medium flex items-center gap-2 px-3 py-1.5 rounded hover:bg-purple-100 transition-colors"
            >
            <Plus size={16} /> Add {title}
            </button>
        </div>
      </div>
    </Card>
  );

  const renderAccountManager = () => (
    <div className="space-y-6">
      {SAAS_CATEGORIES.map(category => {
          const categoryAccounts = data.accounts.filter(a => a.category === category);
          return (
            <Card key={category} title={category} className="border-l-4 border-l-purple-600 shadow-md">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                            <tr>
                                <th className="px-4 py-2 w-5/12">Account Name</th>
                                <th className="px-4 py-2 w-5/12">Hyperion Mapping</th>
                                <th className="px-4 py-2 w-2/12 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categoryAccounts.map((acc, idx) => (
                                <tr key={acc.code} className="border-b last:border-0 hover:bg-purple-50/30 transition-colors group">
                                    <td className="p-2 pl-4">
                                        <input 
                                            className="w-full border border-slate-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                                            value={acc.name}
                                            onChange={(e) => updateAccount(acc.code, 'name', e.target.value)}
                                        />
                                    </td>
                                    <td className="p-2">
                                        <input 
                                            className="w-full border border-slate-300 rounded px-2 py-1.5 bg-yellow-50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-mono text-xs"
                                            value={acc.hyperionMap}
                                            placeholder="Code(s)"
                                            onChange={(e) => updateAccount(acc.code, 'hyperionMap', e.target.value)}
                                        />
                                    </td>
                                    <td className="p-2">
                                        <div className="flex items-center justify-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => moveAccount(category, acc.code, 'up')}
                                                disabled={idx === 0}
                                                className="p-1 text-slate-400 hover:text-purple-600 disabled:opacity-30 hover:bg-purple-50 rounded"
                                            >
                                                <ArrowUp size={16} />
                                            </button>
                                            <button 
                                                onClick={() => moveAccount(category, acc.code, 'down')}
                                                disabled={idx === categoryAccounts.length - 1}
                                                className="p-1 text-slate-400 hover:text-purple-600 disabled:opacity-30 hover:bg-purple-50 rounded"
                                            >
                                                <ArrowDown size={16} />
                                            </button>
                                            <div className="w-px h-4 bg-slate-300 mx-1"></div>
                                            <button 
                                                onClick={() => removeAccount(acc.code)}
                                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                title="Delete Account"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                        <button 
                            onClick={() => addAccount(category)}
                            className="text-sm text-purple-700 hover:text-purple-900 font-medium flex items-center gap-2 px-3 py-1.5 rounded hover:bg-purple-100 transition-colors"
                        >
                            <Plus size={16} /> Add Account to {category}
                        </button>
                    </div>
                </div>
            </Card>
          );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex space-x-4 border-b border-slate-200">
        <button 
          className={`py-2 px-4 font-medium transition-colors ${activeTab === 'mappings' ? 'border-b-2 border-purple-600 text-purple-800' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('mappings')}
        >
          Chart of Accounts & Map
        </button>
        <button 
          className={`py-2 px-4 font-medium transition-colors ${activeTab === 'data' ? 'border-b-2 border-purple-600 text-purple-800' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('data')}
        >
          Data Management
        </button>
      </div>

      {activeTab === 'mappings' && (
        <div className="animate-fade-in space-y-8">
           <div className="p-4 bg-purple-50 text-purple-900 rounded border border-purple-100 mb-6 flex items-start gap-3 shadow-sm">
              <CheckCircle size={20} className="mt-0.5 shrink-0 text-purple-600" />
              <div>
                  <h4 className="font-semibold">Standard SaaS Financial Model</h4>
                  <p className="text-sm mt-1 text-purple-800/80">
                      Tier 1 categories (Revenue, COGS, OpEx, FCF) are fixed. 
                      Customize sub-accounts and mapping below. Use arrows to re-order items; this order will be reflected in all dropdowns.
                  </p>
              </div>
           </div>

          {renderAccountManager()}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-200">
             {renderFlexibleTable('Product Lines', 'productLines')}
             {renderFlexibleTable('Cost Centers', 'costCenters')}
          </div>
        </div>
      )}

      {activeTab === 'data' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Workspace Location">
             <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Select a folder on your local computer to store your data. 
                  The app will read/write three separate JSON files in this location.
                </p>
                
                <div className="p-4 bg-slate-100 rounded border border-slate-200">
                  <div className="flex items-center gap-3 mb-3">
                    {folderName ? (
                      <CheckCircle className="text-purple-600" size={24} />
                    ) : (
                      <AlertTriangle className="text-amber-500" size={24} />
                    )}
                    <div>
                      <p className="font-semibold text-slate-800">
                        {folderName ? "Active Workspace" : "No Workspace Selected"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {folderName ? `Connected to: ${folderName}` : "Data is currently not saving to disk."}
                      </p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={onSelectFolder}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-700 to-purple-600 text-white py-2 px-4 rounded hover:from-purple-800 hover:to-purple-700 transition shadow-sm"
                  >
                    <FolderOpen size={18} />
                    {folderName ? "Switch Folder" : "Select Workspace Folder"}
                  </button>
                </div>
                
                {!folderName && (
                   <div className="bg-red-50 text-red-700 p-3 rounded text-sm flex items-start gap-2 border border-red-100">
                     <AlertCircle size={16} className="mt-0.5 shrink-0" />
                     <p>Warning: You are in memory-only mode. Any changes made will be lost when you close this tab. Please select a folder to save your work.</p>
                   </div>
                )}
             </div>
          </Card>

           <Card title="System Info">
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex justify-between border-b py-2">
                  <span>Data Version:</span>
                  <span className="font-mono">v2.1 (Dynamic Accounts)</span>
                </div>
                <div className="flex justify-between border-b py-2">
                  <span>Last Modified:</span>
                  <span>{new Date(data.lastModified).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b py-2">
                  <span>Records:</span>
                  <span>{data.records.length}</span>
                </div>
                <div className="flex justify-between border-b py-2">
                  <span>Opportunities:</span>
                  <span>{data.opportunities.length}</span>
                </div>
              </div>
           </Card>
        </div>
      )}
    </div>
  );
};