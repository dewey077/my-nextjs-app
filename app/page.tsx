"use client";
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Package, TrendingUp, AlertTriangle, Plus, Trash2, ShoppingCart, Sun, Moon, Search, Filter, DollarSign, Sparkles, X, Activity, ScanLine, Bell, CalendarClock, Download } from "lucide-react";
import { motion, AnimatePresence, Variants } from "framer-motion";

// @ts-ignore
import { Html5QrcodeScanner } from "html5-qrcode";

interface Medicine {
  id: string; 
  name: string; 
  quantity: number; 
  sales: number; 
  threshold: number; 
  price: number; 
  expiryDate: string;
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
  const [newExpiry, setNewExpiry] = useState("");
  const [sellAmounts, setSellAmounts] = useState<Record<string, string>>({});

  const [darkMode, setDarkMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | null }>({ message: '', type: null });

  const [showInsights, setShowInsights] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [showScanner, setShowScanner] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type }); 
    setTimeout(() => setToast({ message: '', type: null }), 3000); 
  };

  const fetchMeds = async () => {
    try {
      const res = await fetch(`/api/medicines?t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json(); 
      setMedicines(data.medicines || []);
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchMeds(); }, []);

  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner("reader", { qrbox: { width: 250, height: 250 }, fps: 5 }, false);
      scanner.render(
        (decodedText: string) => {
          setSearchTerm(decodedText);
          setShowScanner(false);
          scanner.clear();
          showToast(`Scanned Code: ${decodedText}`, "success");
        }, 
        (error: any) => {} 
      );
      return () => { scanner.clear().catch(console.error); };
    }
  }, [showScanner]);

  const addMedicine = async () => {
    if (!newName || !newQuantity || !newPrice || !newExpiry) return showToast("Please fill all fields", "error");
    const payload = { 
      name: newName, 
      quantity: Number(newQuantity), 
      threshold: Number(newThreshold), 
      price: Number(newPrice), 
      expiryDate: newExpiry 
    };
    try {
      await fetch("/api/medicines", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      setNewName(""); setNewQuantity(""); setNewThreshold("20"); setNewPrice(""); setNewExpiry("");
      fetchMeds(); 
      showToast(`${newName} added!`, "success");
    } catch (error) { 
      showToast("Error adding item", "error"); 
    }
  };

  const handleSellAmountChange = (id: string, value: string) => {
    setSellAmounts((prev) => ({ ...prev, [id]: value }));
  };

  const sellMedicine = async (id: string) => {
    const amountToSell = Number(sellAmounts[id]) || 1; 
    const medicine = medicines.find((m) => m.id === id);
    if (!medicine) return;
    if (amountToSell <= 0 || amountToSell > (medicine.quantity || 0)) return showToast("Invalid quantity.", "error");

    setMedicines((prev) => prev.map((med) => 
      med.id === id ? { ...med, quantity: med.quantity - amountToSell, sales: med.sales + amountToSell } : med
    ));
    try {
      await fetch("/api/medicines", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, amount: amountToSell }) });
      setSellAmounts((prev) => ({ ...prev, [id]: "" })); 
      showToast(`Sale recorded!`, "success");
    } catch (error) { 
      fetchMeds(); 
    }
  };

  const deleteMedicine = async (id: string) => {
    setMedicines((prev) => prev.filter((med) => med.id !== id));
    try { 
      await fetch(`/api/medicines?id=${id}`, { method: "DELETE" }); 
      showToast(`Deleted.`, "success"); 
    } catch (error) { 
      fetchMeds(); 
    }
  };

  const notifyManager = async (medicine: Medicine) => {
    showToast(`Sending email alert for ${medicine.name}...`, "success");
    try {
      await fetch("/api/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(medicine) });
      showToast(`Manager Notified!`, "success");
    } catch (error) { 
      showToast("Failed to send email", "error"); 
    }
  };

  const exportToCSV = () => {
    const headers = ["ID,Name,Current Stock,Lifetime Sales,Price (Rs),Total Revenue (Rs),Expiry,Status"];
    const rows = medicines.map(m => {
      const q = m.quantity || 0; const t = m.threshold || 20; const s = m.sales || 0; const p = m.price || 0;
      const status = q === 0 ? "Out of Stock" : q <= t ? "Reorder Soon" : "Healthy";
      return `${m.id},${m.name},${q},${s},${p},${s * p},${m.expiryDate},${status}`;
    });
    const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "pharmacy_inventory_report.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    showToast("Exported to CSV!", "success");
  };

  const isExpiringSoon = (dateString: string) => {
    if (!dateString) return false;
    const expiry = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(expiry.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && expiry > today;
  };

  const generateAIInsights = () => {
    const generatedInsights: Insight[] = [];
    medicines.forEach((med) => {
      const q = Number(med.quantity) || 0; 
      const s = Number(med.sales) || 0; 
      const t = Number(med.threshold) || 20;
      const velocity = s > 0 ? (s / (q + s)) : 0; 
      
      if (isExpiringSoon(med.expiryDate)) {
        generatedInsights.push({ medicine: med.name, status: 'critical', message: `WARNING: Batch expires in less than 30 days!`, action: `Immediately apply 50% discount to liquidate ${q} units.` });
      } else if (q === 0) {
        generatedInsights.push({ medicine: med.name, status: 'critical', message: `Stock completely depleted. Historical demand is high.`, action: `Immediate reorder of ${Math.max(t * 2, 50)} units recommended.` });
      } else if (velocity > 0.7 && q <= t * 1.5) {
        generatedInsights.push({ medicine: med.name, status: 'warning', message: `High market demand detected. Sales velocity is ${Math.round(velocity * 100)}%.`, action: `Preemptively order ${Math.round(s * 0.5)} units.` });
      }
    });
    if (generatedInsights.length === 0) {
      generatedInsights.push({ medicine: "System Wide", status: 'good', message: "Market supply, demand, and expiry dates are healthy.", action: "No immediate actions required." });
    }
    setInsights(generatedInsights); 
    setShowInsights(true);
  };

  const totalItems = medicines.reduce((sum, med) => sum + (Number(med.quantity) || 0), 0);
  const totalRevenue = medicines.reduce((sum, med) => sum + ((Number(med.sales) || 0) * (Number(med.price) || 0)), 0);
  const lowStockItems = medicines.filter(med => (Number(med.quantity) || 0) <= (Number(med.threshold) || 20));

  const filteredMedicines = medicines.filter(med => {
    const matchesSearch = med.name.toLowerCase().includes(searchTerm.toLowerCase());
    const q = Number(med.quantity) || 0; 
    const t = Number(med.threshold) || 20;
    const matchesFilter = filterType === "all" ? true : filterType === "low" ? q > 0 && q <= t : filterType === "out" ? q === 0 : true;
    return matchesSearch && matchesFilter;
  });

  const chartData = medicines.map(m => ({ 
    ...m, 
    sales: Number(m.sales) || 0, 
    quantity: Number(m.quantity) || 0 
  }));

  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: Variants = { hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 24 } } };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-blue-600"><Activity className="animate-spin" size={32} /></div>;

  return (
    <div className={darkMode ? "dark" : ""}>
      
      {/* GLOBAL STYLES FOR CUSTOM ENTERPRISE SCROLLBARS */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />

      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300">
        
        <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-lg"><Activity className="text-white" size={20} /></div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">MediTrack Pro</span>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setDarkMode(!darkMode)} className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-yellow-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
          </div>
        </nav>

        <AnimatePresence>
          {toast.type && (
            <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} className={`fixed top-20 right-6 z-50 px-6 py-3 rounded-lg shadow-xl font-medium flex items-center gap-2 text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
              {toast.type === 'success' ? <TrendingUp size={20}/> : <AlertTriangle size={20}/>} {toast.message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Modal */}
        <AnimatePresence>
          {showInsights && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowInsights(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative z-10">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-gray-800/50 dark:to-gray-800/50">
                  <div className="flex items-center gap-2"><Sparkles className="text-indigo-600" size={24} /><h2 className="text-xl font-bold text-gray-800 dark:text-white">AI Market Analysis</h2></div>
                  <button onClick={() => setShowInsights(false)}><X size={24} /></button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-4">
                  {insights.map((insight, idx) => (
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }} key={idx} className={`p-4 rounded-xl border ${insight.status === 'critical' ? 'bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30' : insight.status === 'warning' ? 'bg-yellow-50/50 border-yellow-100 dark:bg-yellow-900/10 dark:border-yellow-900/30' : 'bg-green-50/50 border-green-100 dark:bg-green-900/10 dark:border-green-900/30'}`}>
                      <h3 className="font-bold text-lg mb-1 dark:text-white capitalize">{insight.medicine}</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-3 text-sm">{insight.message}</p>
                      <div className="flex items-center gap-2 text-sm font-medium"><span className="px-2 py-1 bg-white dark:bg-gray-800 rounded-md border border-gray-100 dark:border-gray-700">Action:</span><span className={`${insight.status === 'critical' ? 'text-red-600' : insight.status === 'warning' ? 'text-yellow-600' : 'text-green-600'}`}>{insight.action}</span></div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Scanner Modal */}
        <AnimatePresence>
          {showScanner && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm" onClick={() => setShowScanner(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg p-6 relative z-10">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2"><ScanLine className="text-blue-600"/> Scan Barcode</h2>
                  <button onClick={() => setShowScanner(false)}><X size={24} /></button>
                </div>
                <div id="reader" className="w-full bg-black rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"></div>
                <p className="text-center text-sm text-gray-500 mt-4">Hold product barcode up to your camera</p>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 relative z-0">
          
          <motion.div initial="hidden" animate="show" variants={containerVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <motion.div variants={itemVariants}>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Overview Dashboard</h1>
            </motion.div>
            <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={generateAIInsights} className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-5 py-2.5 rounded-lg font-medium shadow-lg hover:shadow-indigo-500/40 transition-all border border-indigo-500/50">
                <Sparkles size={18} /> Run AI Analysis
              </motion.button>

              {/* RESTORED: CSV Export Button */}
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={exportToCSV} className="flex items-center gap-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm">
                <Download size={18} /> Export CSV
              </motion.button>

            </motion.div>
          </motion.div>

          {/* Cards load normally */}
          <motion.div initial="hidden" animate="show" variants={containerVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
             {/* ... Standard KPI Cards ... */}
            <motion.div variants={itemVariants} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl"><Package size={24} /></div>
              <div><p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Stock</p><p className="text-2xl font-bold dark:text-white">{totalItems}</p></div>
            </motion.div>
            <motion.div variants={itemVariants} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl"><DollarSign size={24} /></div>
              <div><p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Revenue</p><p className="text-2xl font-bold dark:text-white">₹{totalRevenue.toLocaleString()}</p></div>
            </motion.div>
            <motion.div variants={itemVariants} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl"><ShoppingCart size={24} /></div>
              <div><p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Top Selling</p><p className="text-xl font-bold capitalize dark:text-white truncate w-24">Item</p></div>
            </motion.div>
            <motion.div variants={itemVariants} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl"><AlertTriangle size={24} /></div>
              <div><p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Action Needed</p><p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{lowStockItems.length} Low</p></div>
            </motion.div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* UPGRADE: Scroll Reveal Animation (whileInView) */}
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5 }} className="lg:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Volume Analysis</h2>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#1f2937" : "#f3f4f6"} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} stroke={darkMode ? "#6b7280" : "#9ca3af"} tick={{ fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} stroke={darkMode ? "#6b7280" : "#9ca3af"} tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{ fill: darkMode ? '#1f2937' : '#f9fafb' }} contentStyle={{ backgroundColor: darkMode ? '#111827' : '#ffffff', border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`, borderRadius: '12px' }} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="sales" name="Total Sales" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Bar dataKey="quantity" name="Stock Remaining" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* UPGRADE: Scroll Reveal Animation */}
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: 0.1 }} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2"><Plus className="text-blue-600" size={20}/> Quick Add Inventory</h2>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-1/2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</label>
                      <input value={newName} onChange={e => setNewName(e.target.value)} className="mt-1 w-full px-3 py-2 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Item Name" />
                    </div>
                    <div className="w-1/2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Price (₹)</label>
                      <input type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} className="mt-1 w-full px-3 py-2 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0.00" />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-1/2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Initial Qty</label>
                      <input type="number" value={newQuantity} onChange={e => setNewQuantity(e.target.value)} className="mt-1 w-full px-3 py-2 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="100" />
                    </div>
                    <div className="w-1/2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Alert At</label>
                      <input type="number" value={newThreshold} onChange={e => setNewThreshold(e.target.value)} className="mt-1 w-full px-3 py-2 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="20" />
                    </div>
                  </div>
                  <div>
                     <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Expiry Date</label>
                     <input type="date" value={newExpiry} onChange={e => setNewExpiry(e.target.value)} className="mt-1 w-full px-3 py-2 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
              </div>
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={addMedicine} className="w-full mt-6 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 py-3 rounded-xl font-medium shadow-md">
                Add to Database
              </motion.button>
            </motion.div>
          </div>

          {/* UPGRADE: Scroll Reveal Animation */}
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: 0.2 }} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50 dark:bg-gray-900/50">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Master Inventory</h2>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <div className="relative w-full sm:w-64 flex gap-2">
                  <button onClick={() => setShowScanner(true)} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors">
                    <ScanLine size={20} />
                  </button>
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search or Scan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                  </div>
                </div>
              </div>
            </div>

            {/* UPGRADE: Sticky Header Table Container */}
            <div className="overflow-x-auto overflow-y-auto max-h-[500px] custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[900px] relative">
                
                {/* UPGRADE: Sticky Header CSS applied here */}
                <thead className="sticky top-0 z-20 backdrop-blur-md bg-white/95 dark:bg-gray-900/95 shadow-sm">
                  <tr className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                    <th className="px-6 py-4 font-semibold">Medicine Name</th>
                    <th className="px-6 py-4 font-semibold">Expiry Date</th>
                    <th className="px-6 py-4 font-semibold">Stock Details</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                
                <AnimatePresence>
                  <tbody>
                    {filteredMedicines.map((med) => (
                      <motion.tr layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key={med.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 group">
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-200 capitalize">{med.name}</td>
                        
                        <td className="px-6 py-4 text-sm">
                          <span className={`flex items-center gap-1.5 ${isExpiringSoon(med.expiryDate) ? 'text-red-600 font-bold' : 'text-gray-600 dark:text-gray-400'}`}>
                            <CalendarClock size={16}/> {med.expiryDate || "N/A"}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {Number(med.quantity) || 0} Units <span className="text-gray-300 mx-2">|</span> ₹{Number(med.price) || 0}
                        </td>
                        <td className="px-6 py-4">
                          {(Number(med.quantity) || 0) === 0 ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">Out of Stock</span>
                          ) : (Number(med.quantity) || 0) <= (Number(med.threshold) || 20) ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">Reorder Soon</span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">Healthy</span>
                          )}
                        </td>
                        <td className="px-6 py-4 flex items-center justify-end gap-2">
                          
                          {(Number(med.quantity) || 0) <= (Number(med.threshold) || 20) && (
                            <button onClick={() => notifyManager(med)} className="flex items-center gap-1 text-xs font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 px-3 py-2 rounded-md transition-colors mr-2">
                              <Bell size={14}/> Notify
                            </button>
                          )}

                          <input type="number" min="1" max={Number(med.quantity) || 0} placeholder="Qty" value={sellAmounts[med.id] || ""} onChange={(e) => handleSellAmountChange(med.id, e.target.value)} disabled={(Number(med.quantity) || 0) === 0} className="w-16 px-2 py-1.5 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
                          <button onClick={() => sellMedicine(med.id)} disabled={(Number(med.quantity) || 0) === 0} className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-md text-sm font-medium disabled:opacity-50">Sell</button>
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
