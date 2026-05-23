"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function DeletePostButton({ postId, size = "default" }: { postId: string; size?: "sm" | "default" | "lg" }) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Post deleted successfully");
        router.refresh();
      } else {
        toast.error("Failed to delete post");
      }
    } catch {
      toast.error("Something went wrong");
    }
  };

  return (
    <Button variant="destructive" size={size} className="gap-1" onClick={handleDelete}>
      <Trash2 className="h-4 w-4" />
      {size === "sm" ? "Delete" : "Delete"}
    </Button>
  );
}