"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "lucide-react";
import { toast } from "sonner";

export default function PostForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPublishing(true);

    const formData = {
      title,
      content,
      scheduledAt: scheduleEnabled && scheduledAt ? new Date(scheduledAt) : null,
    };

    try {
      const res = await fetch("/api/posts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success("Post published successfully!");
        router.push("/posts");
        router.refresh();
      } else {
        toast.error("Failed to publish post");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto bg-slate-950/50 border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <span className="text-2xl">📨</span>
          Create New Post
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="title">Post Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter post title"
              required
            />
          </div>

          <div>
            <Label htmlFor="content">Message Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your message here..."
              rows={6}
              required
            />
          </div>

          {/* Schedule */}
          <div className="flex items-center gap-3">
            <Switch
              id="schedule"
              checked={scheduleEnabled}
              onCheckedChange={setScheduleEnabled}
            />
            <Label htmlFor="schedule" className="flex items-center gap-2 cursor-pointer">
              <Calendar className="h-4 w-4" />
              Schedule for later
            </Label>
          </div>

          {scheduleEnabled && (
            <div>
              <Label htmlFor="scheduledAt">Schedule Date & Time</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={isPublishing}>
            {isPublishing ? "Publishing..." : "Publish to Telegram"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}