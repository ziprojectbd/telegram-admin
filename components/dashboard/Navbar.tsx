"use client";

import { SessionUser } from "@/types";
import ThemeToggle from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogOut, Menu } from "lucide-react";
import { signOut } from "next-auth/react";

export default function Navbar({ user, onMenuClick }: { user: SessionUser; onMenuClick: () => void }) {
  return (
    <header className="h-16 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 px-4 md:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h2 className="font-semibold text-lg bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
          Welcome back, {user.name?.split(" ")[0] || "Admin"} 👋
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-3 px-2 hover:bg-slate-800/50 transition-colors">
              <Avatar className="h-9 w-9 ring-2 ring-indigo-500/20">
                <AvatarImage src={user.image || ""} />
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-semibold">
                  {user.name?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden md:block text-slate-300">{user.email}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800">
            <DropdownMenuItem
              className="text-red-400 cursor-pointer hover:text-red-300 hover:bg-red-500/10"
              onClick={async () => {
                await signOut({ redirectTo: "/login" });
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}