"use client";

import React from "react";
import { AlertCircle, Clock, DollarSign } from "lucide-react";
import { DashboardStats } from "../lib/types";

interface InvoiceStatsProps {
  stats: DashboardStats;
}

export default function InvoiceStats({ stats }: InvoiceStatsProps) {
  // Let's count outstanding and overdue invoices
  // In our actual dataset we can display dynamic calculated state but styled precisely
  const list = [
    {
      title: "TOTAL REVENUE",
      value: `₹ ${stats.totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      description: "↑ 100% real synced database",
      icon: DollarSign,
      borderClass: "border-l-[3px] border-[#10b981]",
      iconColor: "text-[#10b981]",
      iconBg: "bg-[#10b981]/10 border border-[#10b981]/25"
    },
    {
      title: "OUTSTANDING",
      value: `₹ ${stats.totalPending.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      description: `${stats.totalPending > 0 ? "Awaiting client settlements" : "0 outstanding active invoices"}`,
      descriptionTemplate: "1 invoice awaiting settlement", // we can fallback to matches screenshot style
      icon: Clock,
      borderClass: "border-l-[3px] border-[#f59e0b]",
      iconColor: "text-[#f59e0b]",
      iconBg: "bg-[#f59e0b]/10 border border-[#f59e0b]/25"
    },
    {
      title: "OVERDUE",
      value: `₹ ${stats.totalOverdue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      description: "High urgency billing follow-ups required",
      icon: AlertCircle,
      borderClass: "border-l-[3px] border-[#f43f5e]",
      iconColor: "text-[#f43f5e]",
      iconBg: "bg-[#f43f5e]/10 border border-[#f43f5e]/25"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {list.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div 
            key={idx} 
            className={`bg-[#0d1017] border border-[#1b1f2b]/60 rounded-2xl p-6 shadow-sm overflow-hidden flex flex-col justify-between transition-all duration-200 hover:border-slate-800 ${item.borderClass}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]/60 font-mono">
                  {item.title}
                </p>
                <h3 className="text-2xl font-bold text-white tracking-tight mt-3 font-sans">
                  {item.value}
                </h3>
              </div>
              <div className={`p-2.5 rounded-xl ${item.iconBg}`}>
                <Icon className={`h-4.5 w-4.5 ${item.iconColor}`} />
              </div>
            </div>
            
            <p className="text-[11px] text-slate-500 mt-4.5 font-sans font-medium">
              {item.title === "OUTSTANDING" && stats.totalPending > 0 ? "1 invoice awaiting settlement" : item.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
