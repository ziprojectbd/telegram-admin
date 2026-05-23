"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare, Send, Activity } from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalChats: 0,
    totalUnread: 0,
    totalPosts: 0,
    botStatus: "Online",
  });

  useEffect(() => {
    const fetchStats = () => {
      fetch("/api/dashboard/stats")
        .then((res) => res.json())
        .then((data) => {
          if (data.totalChats !== undefined) setStats(data);
        })
        .catch(() => {});
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const cards = [
    {
      title: "Total Chats",
      value: stats.totalChats,
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Unread Messages",
      value: stats.totalUnread,
      icon: MessageSquare,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    {
      title: "Posts Published",
      value: stats.totalPosts,
      icon: Send,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      title: "Bot Status",
      value: stats.botStatus,
      icon: Activity,
      color: stats.botStatus === "Online" ? "text-emerald-500" : "text-yellow-500",
      bg: "bg-emerald-500/10",
      pulse: stats.botStatus === "Online",
    },
  ];

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8 text-white">Dashboard Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="bg-zinc-900/50 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">
                  {card.title}
                </CardTitle>
                <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold text-white ${card.pulse ? "animate-pulse" : ""}`}>
                  {card.value}
                </p>
                {card.title === "Bot Status" && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        stats.botStatus === "Online" ? "bg-emerald-500" : "bg-yellow-500"
                      }`}
                    />
                    <span className="text-xs text-zinc-500">
                      {stats.botStatus === "Online" ? "Receiving messages" : "No recent activity"}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}