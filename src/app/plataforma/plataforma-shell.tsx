"use client";

import Link from "next/link";
import { ArrowLeftCircle, ShieldCheck } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PlataformaSidebar } from "./plataforma-sidebar";

interface PlataformaShellProps {
  children: React.ReactNode;
  userEmail: string;
  hasMembership: boolean;
  logoutButton: React.ReactNode;
}

export function PlataformaShell({
  children,
  userEmail,
  hasMembership,
  logoutButton,
}: PlataformaShellProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        {/* Sidebar da Plataforma */}
        <PlataformaSidebar />

        <div className="flex flex-1 flex-col">
          {/* Header Superior da Plataforma */}
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border/60 bg-card/80 px-4 backdrop-blur-md md:px-6">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
              <div className="mx-1 h-4 w-px bg-border/60" />
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold tracking-tight">Platform Admin</span>
            </div>

            <div className="flex items-center gap-4">
              {hasMembership && (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeftCircle className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Voltar para minha instituição</span>
                </Link>
              )}
              
              <span className="hidden text-xs text-muted-foreground md:inline font-mono">
                {userEmail}
              </span>

              {logoutButton}
            </div>
          </header>

          {/* Conteúdo dinâmico das rotas /plataforma/* */}
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
