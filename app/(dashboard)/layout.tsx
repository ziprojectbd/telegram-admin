import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import DashboardLayoutClient from "@/components/dashboard/DashboardLayout";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const user = {
    id: session.user.id || "demo-user",
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
  };

  return <DashboardLayoutClient user={user}>{children}</DashboardLayoutClient>;
}