"use client";

export default function DashboardSkeleton() {
  return (
    <div>
      <div className="h-10 w-72 bg-white/5 rounded-lg animate-pulse mb-8" />

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
          >
            <div className="flex items-center justify-between pb-2">
              <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
              <div className="w-10 h-10 rounded-lg bg-white/5 animate-pulse" />
            </div>
            <div className="mt-3">
              <div className="h-9 w-16 bg-white/5 rounded animate-pulse" />
              <div className="h-3 w-32 bg-white/5 rounded animate-pulse mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}