"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Eye, EyeOff, Save, RefreshCw, Bot, Users, MessageSquare } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({
    botToken: "",
    telegramChatId: "",
    adminEmail: "",
    adminPassword: "",
    autoReplyEnabled: false,
    welcomeMessage: "",
  });

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setForm({
          botToken: data.botToken || "",
          telegramChatId: data.telegramChatId || "",
          adminEmail: data.adminEmail || "",
          adminPassword: data.adminPassword || "",
          autoReplyEnabled: data.autoReplyEnabled ?? false,
          welcomeMessage: data.welcomeMessage || "",
        });
        setShowToken(false);
        setShowPass(false);
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: form.botToken.startsWith("••••") ? undefined : form.botToken,
          telegramChatId: form.telegramChatId,
          adminEmail: form.adminEmail,
          adminPassword: form.adminPassword.startsWith("••••") ? undefined : form.adminPassword,
          autoReplyEnabled: form.autoReplyEnabled,
          welcomeMessage: form.welcomeMessage,
        }),
      });

      if (res.ok) {
        toast.success("Settings saved successfully");
      } else {
        toast.error("Failed to save settings");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-white">Settings</h1>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-8">
            <div className="space-y-4 animate-pulse">
              {[1,2,3,4].map(i => <div key={i} className="h-10 bg-zinc-800 rounded w-full" />)}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold mb-8 text-white">Settings</h1>

      <div className="space-y-6">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Bot className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-white">Telegram Bot Configuration</CardTitle>
                <p className="text-sm text-zinc-500 mt-0.5">Bot token and channel settings</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Bot Token */}
            <div>
              <Label htmlFor="botToken" className="text-zinc-300">Bot Token</Label>
              <p className="text-xs text-zinc-500 mb-1.5">From @BotFather on Telegram</p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    id="botToken"
                    value={form.botToken}
                    onChange={(e) => setForm({ ...form, botToken: e.target.value })}
                    type={showToken ? "text" : "password"}
                    autoComplete="new-password"
                    className="w-full bg-zinc-800/50 border-zinc-700 text-white"
                    placeholder="Enter bot token"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowToken(!showToken)}
                  className="shrink-0 border-zinc-700 bg-zinc-800/50 hover:bg-zinc-700 text-zinc-400"
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Channel ID */}
            <div>
              <Label htmlFor="telegramChatId" className="text-zinc-300">Channel / Chat ID</Label>
              <p className="text-xs text-zinc-500 mb-1.5">Your channel username or numeric ID</p>
              <Input
                id="telegramChatId"
                value={form.telegramChatId}
                onChange={(e) => setForm({ ...form, telegramChatId: e.target.value })}
                className="w-full bg-zinc-800/50 border-zinc-700 text-white"
                placeholder="Channel username or ID"
              />
            </div>
          </CardContent>
        </Card>

        {/* Admin Account */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <CardTitle className="text-white">Admin Account</CardTitle>
                <p className="text-sm text-zinc-500 mt-0.5">Login credentials for admin panel access</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label htmlFor="adminEmail" className="text-zinc-300">Admin Email</Label>
              <p className="text-xs text-zinc-500 mb-1.5">Email used for admin login</p>
              <Input
                id="adminEmail"
                value={form.adminEmail}
                onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                autoComplete="off"
                className="w-full bg-zinc-800/50 border-zinc-700 text-white"
                placeholder="admin@telegram.dev"
              />
            </div>

            <div>
              <Label htmlFor="adminPassword" className="text-zinc-300">Admin Password</Label>
              <p className="text-xs text-zinc-500 mb-1.5">Password for admin login</p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    id="adminPassword"
                    value={form.adminPassword}
                    onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                    type={showPass ? "text" : "password"}
                    autoComplete="new-password"
                    className="w-full bg-zinc-800/50 border-zinc-700 text-white"
                    placeholder="Enter password"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPass(!showPass)}
                  className="shrink-0 border-zinc-700 bg-zinc-800/50 hover:bg-zinc-700 text-zinc-400"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <RefreshCw className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <CardTitle className="text-white">Preferences</CardTitle>
                <p className="text-sm text-zinc-500 mt-0.5">Bot behavior and welcome message settings</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-zinc-300">Auto Reply</Label>
                <p className="text-sm text-zinc-500">Enable automatic replies to incoming messages</p>
              </div>
              <Switch
                checked={form.autoReplyEnabled}
                onCheckedChange={(v) => setForm({ ...form, autoReplyEnabled: v })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="welcomeMessage" className="text-zinc-300">Welcome Message</Label>
              <p className="text-xs text-zinc-500">Sent when a user starts the bot with <code className="text-zinc-400 bg-zinc-800/50 px-1 rounded text-[10px]">/start</code>. Use <code className="text-zinc-400 bg-zinc-800/50 px-1 rounded text-[10px]">{"${name}"}</code> for the user's first name.</p>
              <Textarea
                id="welcomeMessage"
                value={form.welcomeMessage}
                onChange={(e) => setForm({ ...form, welcomeMessage: e.target.value })}
                className="w-full bg-zinc-800/50 border-zinc-700 text-white min-h-[100px] mt-2"
                placeholder={`Welcome to the Admin Panel Bot!\n\nHello! You have been successfully registered.\n\nThank you for connecting!`}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save */}
        <div className="flex gap-3 items-center">
          <Button
            onClick={handleSave}
            disabled={saving}
            size="lg"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            <Save className="h-5 w-5" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
          <p className="text-xs text-zinc-600 max-w-[200px]">
            Settings override .env values. Tokens stored in database.
          </p>
        </div>
      </div>
    </div>
  );
}