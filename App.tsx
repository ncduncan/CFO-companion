import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  PieChart,
  BarChart3,
  Settings as SettingsIcon,
  TrendingUp,
  Menu,
  X,
  Save
} from 'lucide-react';
import {
  isFileSystemSupported,
  getStoredDirectoryHandle,
  storeDirectoryHandle,
  readDataFromDirectory,
  writeDataToDirectory,
  verifyPermission
} from './services/storageService';
import { AppData, INITIAL_DATA } from './types';
import { Dashboard } from './views/Dashboard';
import { Forecast } from './views/Forecast';
import { Settings } from './views/Settings';
import { RiskOpportunityView } from './views/RiskOpportunity';
import { AnalystChat } from './views/AnalystChat';
import { Reporting } from './views/Reporting';

enum View {
  DASHBOARD = 'Dashboard',
  BUDGET = 'Forecast',
  REPORTING = 'Reporting',
  IMPROVEMENT = 'Risk & Opps',
  ANALYST = 'AI Analyst',
  SETTINGS = 'Settings'
}

const App: React.FC = () => {
  const [data, setData] = useState<AppData>(INITIAL_DATA);
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>(localStorage.getItem('GEMINI_API_KEY') || '');

  const handleSetApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('GEMINI_API_KEY', key);
  };

  // Initial Load - Check for stored handle
  useEffect(() => {
    const init = async () => {
      if (isFileSystemSupported()) {
        const storedHandle = await getStoredDirectoryHandle();
        if (storedHandle) {
          setDirHandle(storedHandle);
          const hasPerm = await verifyPermission(storedHandle, false);
          if (hasPerm) {
            const fileData = await readDataFromDirectory(storedHandle);
            setData(fileData);
            setStatusMsg("Loaded from local workspace.");
          } else {
            setStatusMsg("Permission needed. Please re-select folder in Settings.");
          }
        }
      }
    };
    init();

    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsMobile(true);
        setSidebarOpen(false);
      } else {
        setIsMobile(false);
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    // Listen for Demo Data Generation
    const handleDemoGen = () => {
      import('./services/dataFactory').then(({ generateStandardSaaSData }) => {
        const newData = generateStandardSaaSData();
        handleDataUpdate(newData);
      });
    };
    window.addEventListener('GENERATE_DEMO_DATA', handleDemoGen);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('GENERATE_DEMO_DATA', handleDemoGen);
    };
  }, []);

  const generateDemoData = useCallback(async () => {
    const { generateStandardSaaSData } = await import('./services/dataFactory');
    const newData = generateStandardSaaSData();
    setData(newData);
    if (dirHandle) writeDataToDirectory(dirHandle, newData);
    setStatusMsg("Demo Data Generated.");
  }, [dirHandle]);

  // Handle Folder Selection
  const handleSelectFolder = async () => {
    if (!isFileSystemSupported()) {
      alert("Your browser does not support the File System Access API. Please use Chrome, Edge, or Opera.");
      return;
    }
    try {
      const handle = await (window as any).showDirectoryPicker();
      setDirHandle(handle);
      await storeDirectoryHandle(handle);

      const fileData = await readDataFromDirectory(handle);
      setData(fileData);
      setStatusMsg(`Connected to: ${handle.name}`);
    } catch (err) {
      console.error("Folder selection failed", err);
      setStatusMsg("Folder selection cancelled or failed.");
    }
  };

  // Data Update & Auto-Save
  const handleDataUpdate = useCallback(async (newData: AppData) => {
    setData(newData);
    if (dirHandle) {
      try {
        setStatusMsg("Saving...");
        const hasPerm = await verifyPermission(dirHandle, true);
        if (hasPerm) {
          await writeDataToDirectory(dirHandle, newData);
          setStatusMsg("Saved to disk.");
          setTimeout(() => setStatusMsg(""), 2000);
        } else {
          setStatusMsg("Save failed: Permission denied.");
        }
      } catch (err) {
        console.error("Save failed", err);
        setStatusMsg("Error saving to disk.");
      }
    } else {
      setStatusMsg("Data in memory (Not saved to disk).");
    }
  }, [dirHandle]);

  const NavItem = ({ view, icon: Icon }: { view: View; icon: React.ElementType }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        if (isMobile) setSidebarOpen(false);
      }}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${currentView === view
        ? 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-lg shadow-purple-900/50 border-l-4 border-purple-400'
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
    >
      <Icon size={20} className={currentView === view ? 'text-purple-200' : ''} />
      <span className="font-medium">{view}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Mobile Sidebar Overlay */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:relative z-30 w-64 h-full bg-slate-900 text-white flex flex-col transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:hidden'
          } ${!isSidebarOpen && !isMobile ? 'md:hidden' : ''}`}
      >
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-md flex items-center justify-center shadow-lg shadow-purple-500/30">
              <BarChart3 className="text-white" size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">CFO Companion</h1>
          </div>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} className="text-slate-400">
              <X size={24} />
            </button>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem view={View.DASHBOARD} icon={LayoutDashboard} />
          <NavItem view={View.BUDGET} icon={PieChart} />
          <NavItem view={View.ANALYST} icon={TrendingUp} />
          <NavItem view={View.REPORTING} icon={BarChart3} />
          <NavItem view={View.IMPROVEMENT} icon={TrendingUp} />
          <div className="pt-4 mt-4 border-t border-slate-800">
            <NavItem view={View.SETTINGS} icon={SettingsIcon} />
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800 text-xs text-slate-500 bg-slate-950">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full ${dirHandle ? 'bg-purple-500' : 'bg-amber-500'}`} />
            <span>{dirHandle ? 'Local Mode: Active' : 'Memory Only'}</span>
          </div>
          <p>v2.5.0 Analyst Edition</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden w-full bg-slate-50/50">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 shadow-sm z-10">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <Menu size={24} />
              </button>
            )}
            <h2 className="text-xl font-semibold text-slate-800">{currentView}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-right hidden sm:block">
              <p className="font-medium text-slate-900">Finance Workspace</p>
              <p className={`text-xs ${statusMsg.includes('failed') || statusMsg.includes('needed') ? 'text-red-500' : 'text-purple-600'}`}>
                {statusMsg || (dirHandle ? `Connected: ${dirHandle.name}` : "Not Saved to Disk")}
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 font-bold shadow-sm">
              CF
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {currentView === View.DASHBOARD && <Dashboard data={data} />}
            {currentView === View.BUDGET && <Forecast data={data} onUpdate={handleDataUpdate} />}
            {currentView === View.ANALYST && <AnalystChat data={data} apiKey={apiKey} />}
            {currentView === View.REPORTING && <Reporting data={data} />}
            {currentView === View.IMPROVEMENT && <RiskOpportunityView data={data} onUpdate={handleDataUpdate} />}
            {currentView === View.SETTINGS && (
              <Settings
                data={data}
                onUpdate={handleDataUpdate}
                onSelectFolder={handleSelectFolder}
                folderName={dirHandle ? dirHandle.name : null}
                onGenerateDemoData={generateDemoData}
                apiKey={apiKey}
                onSetApiKey={handleSetApiKey}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;