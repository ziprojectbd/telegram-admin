import { notFound } from "next/navigation";
import dbConnect from "@/lib/db";
import Post from "@/models/Post";
import EditPostForm from "./EditPostForm";

export default async function EditPostPage({ params }: { params: { id: string } }) {
  await dbConnect();
  const post = await Post.findById(params.id).lean() as any;

  if (!post) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Edit Post</h1>
      <EditPostForm post={post} />
    </div>
  );
}