"use client";

import React from "react";
import { 
  FileText, 
  LayoutDashboard, 
  Settings, 
  Users,
  Database,
  LogOut,
  Sparkles
} from "lucide-react";

interface SidebarProps {
  currentTab: string;
  onChangeTab: (tab: string) => void;
  onResetSeedData: () => void;
  flaggedLog: string[];
}

export default function Sidebar({ 
  currentTab, 
  onChangeTab, 
  onResetSeedData, 
  flaggedLog 
}: SidebarProps) {
  const links = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "invoices", label: "Invoices", icon: FileText },
    { id: "customers", label: "Customers", icon: Users },
    { id: "settings", label: "Settings & Products", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#0a0c10] text-slate-100 min-h-screen flex flex-col justify-between border-r border-slate-900 select-none">
      <div className="flex-1 flex flex-col">
        {/* Branding Title matching screenshot exactly with sparkle icon and premium account */}
        <div className="p-6 border-b border-slate-900/60 flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="h-5 w-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white font-sans">Invoicely</h1>
            <p className="text-[10px] text-slate-500 font-medium tracking-wide">Premium Account</p>
          </div>
        </div>

        {/* Navigation bar with purple highlight strip on the far right edge */}
        <nav className="p-4 space-y-1 mt-4">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = currentTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => onChangeTab(link.id)}
                className={`w-full relative flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? "bg-[#141822] text-white" 
                    : "text-slate-400 hover:bg-[#0f121a] hover:text-slate-100"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`h-4.5 w-4.5 transition-colors ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
                  <span>{link.label}</span>
                </div>
                {/* Active marker on the right end */}
                {isActive && (
                  <span className="absolute right-3 top-3 bottom-3 w-[3px] bg-[#6366f1] rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Demo data action inside the navigation rail */}
        <div className="p-4">
          <button
            onClick={onResetSeedData}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-slate-900/40 hover:bg-slate-900 hover:text-white border border-slate-800/60 rounded-xl text-xs text-slate-400 transition cursor-pointer font-medium"
          >
            <Database className="h-3.5 w-3.5 text-indigo-400" />
            <span>Reset Database Registers</span>
          </button>
        </div>
      </div>

      {/* Quota limit widget and user profile exactly as screenshot */}
      <div className="flex flex-col">
        {/* QUOTA USAGE (Spark Tier) container */}
        <div className="mx-4 p-4 bg-[#0d1017] border border-slate-900 rounded-2xl mb-4">
          <div className="flex items-center justify-between text-[10px] font-bold tracking-wider font-mono">
            <span className="text-indigo-400">QUOTA USAGE</span>
            <span className="text-slate-500">Spark Tier</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5 font-medium">Enterprise DB active. 24h reset.</p>
          
          {/* Progress bar matching the layout */}
          <div className="w-full bg-slate-950 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full w-[35%] rounded-full shadow-md shadow-indigo-500/30" />
          </div>
        </div>

        {/* User profile identifier block */}
        <div className="p-4 border-t border-slate-900 bg-[#07090d] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Circle avatar with green accent */}
            <div className="h-9 w-9 bg-emerald-900/30 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center font-bold text-sm">
              N
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-slate-200 truncate">Ranju Devi</h4>
              <p className="text-[10px] text-slate-500 truncate font-mono">ranjudevi55728@gmail.com</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onResetSeedData}
            title="Settle/reset applet settings"
            className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-500 hover:text-slate-200 transition cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
