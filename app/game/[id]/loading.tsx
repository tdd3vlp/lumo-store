export default function GamePageLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-4 py-6 md:px-6 lg:px-8">
      <div className="mb-4 h-4 w-48 rounded-full bg-white/60" />

      <div className="overflow-hidden rounded-[32px] bg-white/40 shadow-[0_18px_40px_rgba(143,92,255,0.08)]">
        <div className="h-[260px] w-full md:h-[420px]" />
      </div>

      <div className="mt-6 rounded-[28px] border border-white/60 bg-white/60 p-5 shadow-[0_14px_30px_rgba(120,92,170,0.08)] md:p-6 xl:p-7">
        <div className="mb-6">
          <div className="mb-3 h-8 w-2/3 rounded-xl bg-white/70 md:h-10" />
          <div className="mt-3 h-6 w-24 rounded-xl bg-white/70" />
        </div>

        <div className="mb-6 flex gap-3">
          <div className="h-[52px] flex-1 rounded-2xl bg-white/50" />
          <div className="h-[52px] w-[52px] rounded-2xl bg-white/50" />
        </div>

        <div className="mb-6 flex gap-3">
          <div className="h-[68px] w-[140px] rounded-2xl bg-white/50" />
          <div className="h-[68px] w-[140px] rounded-2xl bg-white/50" />
        </div>

        <div className="space-y-2">
          <div className="h-4 w-full rounded-full bg-white/50" />
          <div className="h-4 w-5/6 rounded-full bg-white/50" />
          <div className="h-4 w-4/6 rounded-full bg-white/50" />
        </div>
      </div>
    </div>
  );
}
