export default function StatCard({ icon: Icon, label, value, color = "text-primary" }) {
  return (
    <div className="bg-card rounded-xl border border-border p-3 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-2">
        <div className={`p-2 rounded-lg bg-primary/10 ${color} w-fit`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider leading-tight">{label}</p>
          <p className="text-sm sm:text-lg font-bold text-foreground mt-0.5 break-words leading-tight">{value}</p>
        </div>
      </div>
    </div>
  );
}