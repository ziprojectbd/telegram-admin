"use client";

export default function ChatListSkeleton() {
  return (
    <div className="w-full lg:w-80 xl:w-96 flex flex-col h-full" style={{ backgroundColor: "#0E1621", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="p-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-2.5">
          <div className="h-6 w-16 bg-white/5 rounded-md animate-pulse" />
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-3"
          >
            {/* Avatar skeleton */}
            <div className="w-12 h-12 rounded-full bg-white/5 animate-pulse shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              {/* Title + time row */}
              <div className="flex items-center justify-between">
                <div className="h-4 w-28 bg-white/5 rounded-md animate-pulse" />
                <div className="h-3 w-10 bg-white/5 rounded-md animate-pulse" />
              </div>
              {/* Last message preview */}
              <div className="h-3 w-44 bg-white/5 rounded-md animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}