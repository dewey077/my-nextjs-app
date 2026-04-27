export const StatusBadge = ({ q }: { q: number }) => {
  const styles = q === 0 ? "bg-rose-100 text-rose-700 border-rose-200" : 
                 q < 15 ? "bg-amber-100 text-amber-700 border-amber-200" : 
                 "bg-emerald-100 text-emerald-700 border-emerald-200";
  const label = q === 0 ? "Out of Stock" : q < 15 ? "Low Stock" : "Healthy";
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles}`}>{label}</span>;
};