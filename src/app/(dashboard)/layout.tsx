"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TenantProvider, useTenant } from "@/lib/tenant";
import { useSession } from "@/lib/session";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  if (loading || !user) return <div className="min-h-screen bg-background" />;

  return (
    <TenantProvider userId={user.id}>
      <Inner session={session}>{children}</Inner>
    </TenantProvider>
  );
}

function Inner({
  children,
  session,
}: {
  children: React.ReactNode;
  session: ReturnType<typeof useSession>["session"];
}) {
  const { memberships, active, loading } = useTenant();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (memberships.length === 0) { router.replace("/onboarding"); return; }
    if (!active && memberships.length > 1) { router.replace("/select-institution"); return; }
    if (active && active.isPoloScoped && active.scopedPoloIds.length === 0) {
      if (pathname !== "/sem-acesso") router.replace("/sem-acesso");
      return;
    }
    if (active && !active.isPoloScoped && pathname === "/sem-acesso") {
      router.replace("/dashboard");
    }
    if (active && active.isPoloScoped && active.scopedPoloIds.length > 0 && pathname === "/sem-acesso") {
      router.replace("/dashboard");
    }
  }, [loading, memberships, active, router, pathname]);

  if (loading || !active) return <div className="min-h-screen bg-background" />;

  const meta = session?.user?.user_metadata as
    | { full_name?: string; name?: string; avatar_url?: string }
    | undefined;
  const name = meta?.full_name ?? meta?.name ?? session?.user?.email ?? "";
  const email = session?.user?.email ?? "";
  const avatar = meta?.avatar_url ?? null;

  const noPoloAccess = active.isPoloScoped && active.scopedPoloIds.length === 0;

  if (noPoloAccess) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <AppHeader userEmail={email} userName={name} avatarUrl={avatar} hideSidebarToggle />
        <main className="flex-1 overflow-auto bg-muted/30">{children}</main>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col">
          <AppHeader userEmail={email} userName={name} avatarUrl={avatar} />
          <main className="flex-1 overflow-auto bg-muted/30">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
