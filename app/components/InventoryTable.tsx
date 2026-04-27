"use client";
import { motion } from 'framer-motion';
import { StatusBadge } from './StatusBadge.tsx';

export default function InventoryTable({ data }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mt-8">
      <table className="w-full text-left">
        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 text-[11px] uppercase font-bold">
          <tr>
            <th className="p-4">Product</th>
            <th className="p-4">Stock</th>
            <th className="p-4">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item: any, i: number) => (
            <motion.tr 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }}
              key={i} className="border-t border-slate-100 dark:border-slate-800"
            >
              <td className="p-4 font-semibold text-sm">{item.name}</td>
              <td className="p-4 text-sm font-mono">{item.stock}</td>
              <td className="p-4"><StatusBadge q={item.stock} /></td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}