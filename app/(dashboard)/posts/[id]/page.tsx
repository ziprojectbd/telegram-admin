import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Calendar, CheckCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import dbConnect from "@/lib/db";
import Post from "@/models/Post";
import DeletePostButton from "@/components/posts/DeletePostButton";

export default async function PostDetailPage({ params }: { params: { id: string } }) {
  await dbConnect();
  const post = await Post.findById(params.id).lean() as any;

  if (!post) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <Link href="/posts">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Posts
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Link href={`/posts/${post._id.toString()}/edit`}>
            <Button variant="outline" className="gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </Link>
          <DeletePostButton postId={post._id.toString()} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-3xl">{post.title}</CardTitle>
            {post.published && (
              <div className="flex items-center gap-1 text-emerald-500 text-sm">
                <CheckCircle className="h-4 w-4" />
                Published
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="prose prose-invert max-w-none whitespace-pre-wrap">
            {post.content}
          </div>

          {post.mediaUrl && (
            <div>
              <p className="text-sm text-zinc-400 mb-2">📎 {post.mediaType || "Attachment"}</p>
              {post.mediaType === "image" && (
                <img
                  src={post.mediaUrl}
                  alt={post.title}
                  className="max-w-full rounded-lg"
                />
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-zinc-400 pt-4 border-t border-zinc-800">
            <span>Created {new Date(post.createdAt).toLocaleString()}</span>
            {post.scheduledAt && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Scheduled: {new Date(post.scheduledAt).toLocaleString()}
              </span>
            )}
            {post.publishedAt && (
              <span>Published {new Date(post.publishedAt).toLocaleString()}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}