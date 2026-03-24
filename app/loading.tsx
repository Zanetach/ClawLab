export default function AppLoading() {
  return (
    <div className="relative z-10 flex flex-1 gap-3 px-3 pb-3 pt-2">
      <aside className="glass-panel flex w-[144px] flex-col rounded-[16px] border-white/8 px-3 py-2">
        <div className="mb-4 flex items-center gap-3 px-2 py-1">
          <div className="h-8 w-8 rounded-xl bg-white/10" />
          <div className="h-4 w-16 rounded bg-white/8" />
        </div>
        <div className="space-y-1.5 py-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-10 rounded-xl bg-white/[0.05]" />
          ))}
        </div>
      </aside>

      <main className="flex-1 overflow-auto rounded-[24px]">
        <div className="p-6">
          <div className="glass-panel rounded-[28px] p-6">
            <div className="mb-6 h-6 w-32 rounded-full bg-white/6" />
            <div className="h-10 w-80 rounded-xl bg-white/8" />
            <div className="mt-3 h-4 w-72 rounded bg-white/6" />

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                  <div className="h-3 w-20 rounded bg-white/6" />
                  <div className="mt-4 h-8 w-24 rounded bg-white/8" />
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-14 rounded-xl bg-white/[0.04]" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
