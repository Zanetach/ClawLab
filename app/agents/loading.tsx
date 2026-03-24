export default function AgentsLoading() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="mb-3 h-6 w-32 rounded-full bg-white/6" />
          <div className="h-10 w-72 rounded-xl bg-white/8" />
          <div className="mt-3 h-4 w-64 rounded bg-white/6" />
        </div>
        <div className="h-12 w-36 rounded-2xl bg-white/8" />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="glass-panel rounded-[24px] p-4">
            <div className="mb-3 h-3 w-24 rounded bg-white/6" />
            <div className="h-8 w-16 rounded bg-white/8" />
          </div>
        ))}
      </div>

      <div className="glass-panel rounded-[24px] border border-white/8 p-4">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-12 rounded-xl bg-white/[0.04]" />
          ))}
        </div>
      </div>
    </div>
  );
}
