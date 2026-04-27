"use client";
import React from 'react';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';

// This simulates the sales/stock flow
const dataFlow = [
  { val: 40 }, { val: 30 }, { val: 65 }, { val: 45 }, 
  { val: 90 }, { val: 55 }, { val: 80 }, { val: 95 }
];

export default function StatsCard({ title, value, color }: { title: string, value: string, color: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-40">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{title}</p>
        <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{value}</h3>
      </div>
      
      {/* The Flow Graph */}
      <div className="h-12 w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dataFlow}>
            <defs>
              <linearGradient id={`colorFlow-${color}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area 
              type="monotone" 
              dataKey="val" 
              stroke={color} 
              fillOpacity={1} 
              fill={`url(#colorFlow-${color})`} 
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}