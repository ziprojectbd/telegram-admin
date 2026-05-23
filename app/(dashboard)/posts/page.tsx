import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, CheckCircle, Eye, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import dbConnect from "@/lib/db";
import Post from "@/models/Post";
import DeletePostButton from "@/components/posts/DeletePostButton";

async function getPosts() {
  await dbConnect();
  const posts = await Post.find({}).sort({ createdAt: -1 }).lean();
  return posts;
}

export default async function PostsPage() {
  const posts = await getPosts();

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">Posts</h1>
        <Link href="/posts/new">
          <Button>
            <Plus className="mr-2 h-5 w-5" />
            New Post
          </Button>
        </Link>
      </div>

      <div className="grid gap-6">
        {posts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-zinc-400">No posts yet. Create your first post!</p>
            </CardContent>
          </Card>
        ) : (
          posts.map((post: any) => (
            <Card key={post._id.toString()}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <Link href={`/posts/${post._id.toString()}`} className="hover:underline">
                    <CardTitle className="text-xl">{post.title}</CardTitle>
                  </Link>
                  {post.published && (
                    <div className="flex items-center gap-1 text-emerald-500 text-sm">
                      <CheckCircle className="h-4 w-4" />
                      Published
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-3 text-zinc-300 mb-4">{post.content}</p>
                
                {post.mediaUrl && (
                  <div className="text-xs bg-zinc-800 inline-block px-3 py-1 rounded-full mb-4">
                    📎 {post.mediaType}
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-zinc-400">
                  <span>Created {new Date(post.createdAt).toLocaleDateString()}</span>
                  {post.scheduledAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Scheduled: {new Date(post.scheduledAt).toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-800">
                  <Link href={`/posts/${post._id.toString()}`}>
                    <Button variant="ghost" size="sm" className="gap-1">
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                  </Link>
                  <Link href={`/posts/${post._id.toString()}/edit`}>
                    <Button variant="ghost" size="sm" className="gap-1">
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                  </Link>
                  <DeletePostButton postId={post._id.toString()} size="sm" />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
