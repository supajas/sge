"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Moon, Sun, ChevronsUpDown, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant";
import { useTheme } from "@/lib/theme";
import { ROLE_LABELS } from "@/lib/roles";
import { useQueryClient } from "@tanstack/react-query";

export function AppHeader({
  userEmail,
  userName,
  avatarUrl,
  hideSidebarToggle,
}: {
  userEmail: string;
  userName: string;
  avatarUrl?: string | null;
  hideSidebarToggle?: boolean;
}) {
  const { memberships, active, setActive } = useTenant();
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-2">
        {!hideSidebarToggle && <SidebarTrigger />}
        {memberships.length > 1 && active && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <span className="max-w-[180px] truncate">{active.institutionName}</span>
                <ChevronsUpDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Trocar instituição</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {memberships.map((m) => (
                <DropdownMenuItem key={m.institutionId} onSelect={() => setActive(m.institutionId)}>
                  <div className="flex-1">
                    <div className="text-sm">{m.institutionName}</div>
                    <div className="text-xs text-muted-foreground">{ROLE_LABELS[m.role]}</div>
                  </div>
                  {m.institutionId === active.institutionId && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Alternar tema">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md p-1 hover:bg-accent">
              <Avatar className="h-8 w-8">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
                <AvatarFallback>{userName?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="text-sm font-medium">{userName}</div>
              <div className="text-xs text-muted-foreground">{userEmail}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {active && (
              <DropdownMenuItem asChild>
                <Link href="/select-institution">Trocar instituição</Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
