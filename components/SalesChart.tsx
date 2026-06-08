"use client";

import React, { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Invoice } from "../lib/types";

interface SalesChartProps {
  invoices: Invoice[];
}

export default function SalesChart({ invoices }: SalesChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Format and group invoices by month
  const getChartData = () => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlySales: { [month: string]: number } = {};

    // Seed default current and neighboring months
    const currentYear = new Date().getFullYear();
    const currentMonthIdx = new Date().getMonth();
    
    for (let i = -3; i <= 2; i++) {
      const idx = (currentMonthIdx + i + 12) % 12;
      monthlySales[months[idx]] = 0;
    }

    invoices.forEach((invoice) => {
      if (invoice.status === "paid") {
        try {
          const date = new Date(invoice.issueDate);
          const monthName = months[date.getMonth()];
          if (monthlySales[monthName] !== undefined) {
            monthlySales[monthName] += invoice.amount;
          } else {
            // Otherwise add month dynamically
            monthlySales[monthName] = invoice.amount;
          }
        } catch (e) {
          // Ignore invalid dates
        }
      }
    });

    return Object.keys(monthlySales).map((month) => ({
      name: month,
      Sales: monthlySales[month],
    }));
  };

  const chartData = getChartData();

  if (!mounted) {
    return (
      <div className="bg-[#0d1017] border border-[#1b1f2b]/60 rounded-2xl p-6 h-80 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center space-y-2">
          <div className="h-4 w-28 bg-slate-800 rounded"></div>
          <div className="h-3 w-16 bg-slate-900 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0d1017] border border-[#1b1f2b]/60 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wider font-sans">
            Income Flow trends
          </h3>
          <p className="text-xs text-slate-500 mt-1 font-medium font-sans">
            Performance index with premium scaling
          </p>
        </div>
        {/* Real-time status indicator matching screenshot */}
        <div className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[9px] font-mono font-bold text-indigo-400 flex items-center space-x-1.5 uppercase tracking-wider">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping" />
          <span>REAL-TIME</span>
        </div>
      </div>

      <div className="h-60 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.01}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1b1f2b/40" />
            <XAxis 
              dataKey="name" 
              stroke="#475569" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false} 
              dy={10}
              className="font-mono"
            />
            <YAxis 
              stroke="#475569" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false} 
              dx={-5}
              className="font-mono"
              tickFormatter={(value) => `₹${value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}`}
            />
            <Tooltip 
              contentStyle={{ background: "#0e111a", border: "1px solid #202533", borderRadius: "12px", color: "#fff" }}
              labelStyle={{ fontSize: "11px", fontWeight: "bold", fontFamily: "var(--font-mono)", color: "#94a3b8" }}
              itemStyle={{ fontSize: "12px", color: "#fff", fontFamily: "var(--font-mono)" }}
              formatter={(value: number) => [`₹${value.toLocaleString()}`, "Settled"]}
            />
            <Area 
              type="monotone" 
              dataKey="Sales" 
              stroke="#6366f1" 
              strokeWidth={3} 
              fillOpacity={1} 
              fill="url(#colorSales)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
