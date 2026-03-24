export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="glass-panel rounded-[28px] p-6">
        <div className="mb-8">
          <div className="mb-3 h-6 w-40 rounded-full bg-white/6" />
          <div className="h-10 w-72 rounded-xl bg-white/8" />
          <div className="mt-3 h-4 w-[28rem] rounded bg-white/6" />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="rounded-[22px] border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="h-5 w-24 rounded bg-white/8" />
                <div className="h-6 w-24 rounded-full bg-white/6" />
              </div>
              <div className="h-4 w-56 rounded bg-white/6" />
              <div className="mt-4 space-y-2 rounded-2xl border border-white/8 bg-[#111827]/46 p-4">
                <div className="h-4 w-full rounded bg-white/6" />
                <div className="h-4 w-3/4 rounded bg-white/6" />
                <div className="h-4 w-2/3 rounded bg-white/6" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
