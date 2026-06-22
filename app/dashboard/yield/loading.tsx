export default function YieldLoading() {
  return (
    <div className="min-h-screen bg-pa-black">
      <div className="h-14 border-b border-pa-border-1 bg-pa-black/80" />
      <div className="max-w-3xl mx-auto px-5 py-10 space-y-8">
        <div className="text-center space-y-2">
          <div className="animate-pulse h-5 w-48 bg-pa-surface-2 rounded mx-auto" />
          <div className="animate-pulse h-10 w-72 bg-pa-surface-2 rounded mx-auto" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-pulse bg-pa-surface-1 border border-pa-border-1 rounded-2xl p-5 space-y-3">
              <div className="h-3 w-20 bg-pa-surface-2 rounded" />
              <div className="h-8 w-28 bg-pa-surface-2 rounded" />
              <div className="h-2 w-full bg-pa-surface-2 rounded-full" />
            </div>
          ))}
        </div>
        <p className="text-pa-text-3 text-[13px] text-center animate-pulse">
          Fetching live market data and calculating scenarios…
        </p>
        <div className="animate-pulse bg-pa-surface-1 border border-pa-border-1 rounded-2xl h-48" />
        <div className="animate-pulse bg-pa-surface-1 border border-pa-border-1 rounded-2xl h-64" />
      </div>
    </div>
  );
}
