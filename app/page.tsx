"use client";
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Package, TrendingUp, AlertTriangle, Plus, Trash2, ShoppingCart, Sun, Moon, Download, Search, Filter, DollarSign, Sparkles, X, Activity } from "lucide-react";
// THE FIX: We imported 'Variants' here to make TypeScript happy!
import { motion, AnimatePresence, Variants } from "framer-motion";

interface Medicine {
  id: string;
  name: string;
  quantity: number;
  sales: number;
  threshold: number;
  price: number;
}

interface Insight {
  medicine: string;
  status: 'critical' | 'warning' | 'good';
  message: string;
  action: string;
}

export default function Home() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newName, setNewName] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [newThreshold, setNewThreshold] = useState("20");
  const [newPrice, setNewPrice] = useState("");
  const [sellAmounts, setSellAmounts] = useState<Record<string, string>>({});

  const [darkMode, setDarkMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | null }>({ message: '', type: null });

  const [showInsights, setShowInsights] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: null }), 3000); 
  };

  const fetchMeds = async () => {
    try {
      const res = await fetch(`/api/medicines?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setMedicines(data.medicines || []);
    } catch (error) {
      showToast("Failed to fetch data.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeds();
  }, []);

  const addMedicine = async () => {
    if (!newName || !newQuantity || !newPrice) return showToast("Please fill all required fields", "error");
    const payload = { name: newName, quantity: Number(newQuantity), threshold: Number(newThreshold), price: Number(newPrice) };
    try {
      await fetch("/api/medicines", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      setNewName(""); setNewQuantity(""); setNewThreshold("20"); setNewPrice("");
      fetchMeds();
      showToast(`${newName} added successfully!`, "success");
    } catch (error) { showToast("Error adding item", "error"); }
  };

  const handleSellAmountChange = (id: string, value: string) => {
    setSellAmounts((prev) => ({ ...prev, [id]: value }));
  };

  const sellMedicine = async (id: string) => {
    const amountToSell = Number(sellAmounts[id]) || 1; 
    const medicine = medicines.find((m) => m.id === id);
    if (!medicine) return;
    if (amountToSell <= 0) return showToast("Enter a valid amount.", "error");
    if (amountToSell > (medicine.quantity || 0)) return showToast(`Not enough stock! Only ${medicine.quantity || 0} left.`, "error");

    setMedicines((prev) => prev.map((med) => 
      med.id === id ? { ...med, quantity: (med.quantity || 0) - amountToSell, sales: (med.sales || 0) + amountToSell } : med
    ));
    try {
      await fetch("/api/medicines", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, amount: amountToSell }) });
      setSellAmounts((prev) => ({ ...prev, [id]: "" }));
      showToast(`Sale recorded for ${medicine.name}!`, "success");
    } catch (error) { 
      showToast("Failed to record sale", "error");
      fetchMeds(); 
    }
  };

  const deleteMedicine = async (id: string) => {
    const medicine = medicines.find((m) => m.id === id);
    setMedicines((prev) => prev.filter((med) => med.id !== id));
    try {
      await fetch(`/api/medicines?id=${id}`, { method: "DELETE" });
      showToast(`${medicine?.name} deleted.`, "success");
    } catch (error) { 
      showToast("Error deleting item", "error");
      fetchMeds(); 
    }
  };

  const exportToCSV = () => {
    const headers = ["ID,Name,Current Stock,Lifetime Sales,Price (Rs),Total Revenue (Rs),Status"];
    const rows = medicines.map(m => {
      const q = m.quantity || 0; const t = m.threshold || 20; const s = m.sales || 0; const p = m.price || 0;
      const status = q === 0 ? "Out of Stock" : q <= t ? "Reorder Soon" : "Healthy";
      return `${m.id},${m.name},${q},${s},${p},${s * p},${status}`;
    });
    const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "pharmacy_inventory_report.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    showToast("Exported to CSV!", "success");
  };

  const generateAIInsights = () => {
    const generatedInsights: Insight[] = [];
    medicines.forEach((med) => {
      const q = med.quantity || 0; const s = med.sales || 0; const t = med.threshold || 20;
      const velocity = s > 0 ? (s / (q + s)) : 0; 
      if (q === 0) {
        generatedInsights.push({ medicine: med.name, status: 'critical', message: `Stock completely depleted. Historical demand is high (${s} lifetime sales).`, action: `Immediate reorder of ${Math.max(t * 2, 50)} units recommended.` });
      } else if (velocity > 0.7 && q <= t * 1.5) {
        generatedInsights.push({ medicine: med.name, status: 'warning', message: `High market demand detected. Sales velocity is ${Math.round(velocity * 100)}%.`, action: `Preemptively order ${Math.round(s * 0.5)} units.` });
      } else if (q > t * 3 && velocity < 0.2) {
        generatedInsights.push({ medicine: med.name, status: 'good', message: `Overstock detected. Sales velocity is low (${Math.round(velocity * 100)}%).`, action: `Halt reorders. Consider discounts to free up capital.` });
      }
    });
    if (generatedInsights.length === 0) {
      generatedInsights.push({ medicine: "System Wide", status: 'good', message: "Market supply and demand are perfectly balanced.", action: "No immediate actions required." });
    }
    setInsights(generatedInsights); setShowInsights(true);
  };

  const totalItems = medicines.reduce((sum, med) => sum + (med.quantity || 0), 0);
  const totalRevenue = medicines.reduce((sum, med) => sum + ((med.sales || 0) * (med.price || 0)), 0);
  const lowStockItems = medicines.filter(med => (med.quantity || 0) <= (med.threshold || 20));
  const topSeller = [...medicines].sort((a, b) => (b.sales || 0) - (a.sales || 0))[0]?.name || "N/A";

  const filteredMedicines = medicines.filter(med => {
    const matchesSearch = med.name.toLowerCase().includes(searchTerm.toLowerCase());
    const q = med.quantity || 0; const t = med.threshold || 20;
    const matchesFilter = filterType === "all" ? true : filterType === "low" ? q > 0 && q <= t : filterType === "out" ? q === 0 : true;
    return matchesSearch && matchesFilter;
  });

  const chartData = medicines.map(m => ({ ...m, sales: m.sales || 0, quantity: m.quantity || 0 }));

  // THE FIX: We explicitly declare the 'Variants' type here so TS stops complaining
  const containerVariants: Variants = { 
    hidden: { opacity: 0 }, 
    show: { opacity: 1, transition: { staggerChildren: 0.1 } } 
  };
  
  const itemVariants: Variants = { 
    hidden: { y: 20, opacity: 0 }, 
    show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 24 } } 
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-blue-600"><Activity className="animate-spin" size={32} /></div>;

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300">
        
        {/* Top Navigation Bar */}
        <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-lg"><Activity className="text-white" size={20} /></div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">MediTrack Pro</span>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setDarkMode(!darkMode)} className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-yellow-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border-2 border-white dark:border-gray-800 shadow-sm"></div>
            </div>
          </div>
        </nav>

        {/* Toast Notification */}
        <AnimatePresence>
          {toast.type && (
            <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} className={`fixed top-20 right-6 z-50 px-6 py-3 rounded-lg shadow-xl font-medium flex items-center gap-2 text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
              {toast.type === 'success' ? <TrendingUp size={20}/> : <AlertTriangle size={20}/>} {toast.message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Modal with Frosted Glass */}
        <AnimatePresence>
          {showInsights && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowInsights(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-200 dark:border-gray-800 relative z-10">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-gray-800/50 dark:to-gray-800/50">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-indigo-600 dark:text-indigo-400" size={24} />
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">AI Market Analysis</h2>
                  </div>
                  <button onClick={() => setShowInsights(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"><X size={24} /></button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                  {insights.map((insight, idx) => (
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }} key={idx} className={`p-4 rounded-xl border ${insight.status === 'critical' ? 'bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30' : insight.status === 'warning' ? 'bg-yellow-50/50 border-yellow-100 dark:bg-yellow-900/10 dark:border-yellow-900/30' : 'bg-green-50/50 border-green-100 dark:bg-green-900/10 dark:border-green-900/30'}`}>
                      <h3 className="font-bold text-lg mb-1 dark:text-white capitalize">{insight.medicine}</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-3 text-sm">{insight.message}</p>
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span className="px-2 py-1 bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-100 dark:border-gray-700">Action:</span>
                        <span className={`${insight.status === 'critical' ? 'text-red-600 dark:text-red-400' : insight.status === 'warning' ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>{insight.action}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 relative z-0">
          
          <motion.div initial="hidden" animate="show" variants={containerVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <motion.div variants={itemVariants}>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Overview Dashboard</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Real-time inventory and revenue metrics.</p>
            </motion.div>
            <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={generateAIInsights} className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-5 py-2.5 rounded-lg font-medium shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all border border-indigo-500/50">
                <Sparkles size={18} /> Run AI Analysis
              </motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={exportToCSV} className="flex items-center gap-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm">
                <Download size={18} /> Export CSV
              </motion.button>
            </motion.div>
          </motion.div>

          <motion.div initial="hidden" animate="show" variants={containerVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div variants={itemVariants} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl"><Package size={24} /></div>
              <div><p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Stock</p><p className="text-2xl font-bold dark:text-white">{totalItems}</p></div>
            </motion.div>
            <motion.div variants={itemVariants} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl"><DollarSign size={24} /></div>
              <div><p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Revenue</p><p className="text-2xl font-bold dark:text-white">₹{totalRevenue.toLocaleString()}</p></div>
            </motion.div>
            <motion.div variants={itemVariants} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl"><ShoppingCart size={24} /></div>
              <div><p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Top Selling</p><p className="text-xl font-bold capitalize dark:text-white truncate w-24">{topSeller}</p></div>
            </motion.div>
            <motion.div variants={itemVariants} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
              <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl"><AlertTriangle size={24} /></div>
              <div><p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Action Needed</p><p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{lowStockItems.length} Low</p></div>
            </motion.div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Volume Analysis</h2>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#1f2937" : "#f3f4f6"} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} stroke={darkMode ? "#6b7280" : "#9ca3af"} tick={{ fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} stroke={darkMode ? "#6b7280" : "#9ca3af"} tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{ fill: darkMode ? '#1f2937' : '#f9fafb' }} contentStyle={{ backgroundColor: darkMode ? '#111827' : '#ffffff', border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`, borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="sales" name="Total Sales" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Bar dataKey="quantity" name="Stock Remaining" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2"><Plus className="text-blue-600" size={20}/> Quick Add Inventory</h2>
                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Medicine Name</label>
                    <input value={newName} onChange={e => setNewName(e.target.value)} className="mt-1.5 w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all" placeholder="e.g. Amoxicillin" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price (₹)</label>
                    <input type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} className="mt-1.5 w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all" placeholder="0.00" />
                  </div>
                  <div className="flex gap-4">
                    <div className="w-1/2">
                      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Initial Qty</label>
                      <input type="number" value={newQuantity} onChange={e => setNewQuantity(e.target.value)} className="mt-1.5 w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all" placeholder="100" />
                    </div>
                    <div className="w-1/2">
                      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Low Alert At</label>
                      <input type="number" value={newThreshold} onChange={e => setNewThreshold(e.target.value)} className="mt-1.5 w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all" placeholder="20" />
                    </div>
                  </div>
                </div>
              </div>
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={addMedicine} className="w-full mt-8 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 py-3 rounded-xl font-medium transition-colors shadow-md">
                Add to Database
              </motion.button>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50 dark:bg-gray-900/50">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Master Inventory</h2>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Search records..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500/50 outline-none text-sm transition-all" />
                </div>
                <div className="relative w-full sm:w-auto">
                  <Filter size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full pl-9 pr-8 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500/50 outline-none text-sm appearance-none transition-all">
                    <option value="all">All Status</option>
                    <option value="low">Low Stock</option>
                    <option value="out">Out of Stock</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                    <th className="px-6 py-4 font-semibold">Medicine Name</th>
                    <th className="px-6 py-4 font-semibold">Price & Stock</th>
                    <th className="px-6 py-4 font-semibold">Sales Metrics</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <AnimatePresence>
                  <tbody>
                    {filteredMedicines.map((med) => (
                      <motion.tr layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} key={med.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-200 capitalize">{med.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium text-gray-900 dark:text-gray-300">₹{med.price || 0}</span> <span className="text-gray-300 dark:text-gray-600 mx-2">|</span> {med.quantity || 0} Units
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {med.sales || 0} Sold <span className="text-gray-300 dark:text-gray-600 mx-2">|</span> <span className="text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded">₹{((med.sales || 0) * (med.price || 0)).toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-4">
                          {(med.quantity || 0) === 0 ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100 dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400">Out of Stock</span>
                          ) : (med.quantity || 0) <= (med.threshold || 20) ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-100 dark:bg-yellow-900/20 dark:border-yellow-900/30 dark:text-yellow-400">Reorder Soon</span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900/30 dark:text-emerald-400">Healthy</span>
                          )}
                        </td>
                        <td className="px-6 py-4 flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <input type="number" min="1" max={med.quantity || 0} placeholder="Qty" value={sellAmounts[med.id] || ""} onChange={(e) => handleSellAmountChange(med.id, e.target.value)} disabled={(med.quantity || 0) === 0} className="w-16 px-2 py-1.5 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 dark:text-white rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50" />
                          <button onClick={() => sellMedicine(med.id)} disabled={(med.quantity || 0) === 0} className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Sell</button>
                          <button onClick={() => deleteMedicine(med.id)} className="text-gray-400 hover:text-red-500 p-2 rounded-lg transition-colors"><Trash2 size={16} /></button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </AnimatePresence>
              </table>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}