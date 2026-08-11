"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant";
import { isAdminLike, type AppRole } from "@/lib/roles";
import { PageBody, PageHeader } from "@/components/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { History, Users, Search } from "lucide-react";
import { toast } from "sonner";

import { updateMembershipAction, removeMembershipAction } from "./actions";
import { type MembershipRow } from "./types";
import { ColaboradoresSkeleton } from "./components/colaboradores-skeleton";
import { ColaboradoresCards } from "./components/colaboradores-cards";
import { ColaboradoresTable } from "./components/colaboradores-table";
import { EditMembershipDialog } from "./components/edit-membership-dialog";

export default function ColaboradoresPage() {
  const tenant = useTenant();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<MembershipRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const canAdmin = tenant.active ? isAdminLike(tenant.active.role) : false;

  const { data = [], isLoading } = useQuery<MembershipRow[]>({
    queryKey: ["memberships-list", tenant.active?.institutionId],
    queryFn: async () => {
      if (!tenant.active) return [];
      const { data, error } = await supabase
        .from("memberships")
        .select(
          `id, role, user_id, 
           profiles!inner(full_name, email, avatar_url, last_sign_in_at), 
           membership_polos(polo_id, polos(id, name)),
           membership_courses(course_id, courses(id, name))`
        )
        .eq("institution_id", tenant.active.institutionId);

      if (error) throw error;

      return (data ?? []).map((m) => {
        const p = m.profiles as unknown as {
          full_name: string;
          email: string;
          avatar_url: string | null;
          last_sign_in_at: string | null;
        };
        const cps = (m.membership_polos ?? []) as unknown as { polos: { id: string; name: string } | null }[];
        const ccs = (m.membership_courses ?? []) as unknown as { courses: { id: string; name: string } | null }[];

        return {
          membershipId: m.id,
          userId: m.user_id,
          role: m.role as AppRole,
          name: p.full_name,
          email: p.email,
          avatar: p.avatar_url,
          lastSignIn: p.last_sign_in_at,
          polos: cps.map((c) => c.polos).filter((x): x is { id: string; name: string } => !!x),
          courses: ccs.map((c) => c.courses).filter((x): x is { id: string; name: string } => !!x),
        };
      });
    },
    enabled: !!tenant.active?.institutionId,
  });

  const save = useMutation({
    mutationFn: updateMembershipAction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["memberships-list"] });
      setTimeout(() => toast.success("Colaborador atualizado com sucesso"), 0);
      setEditing(null);
    },
    onError: (e: Error) => setTimeout(() => toast.error(e.message), 0),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await removeMembershipAction({ membership_id: id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["memberships-list"] });
      setTimeout(() => toast.success("Colaborador removido com sucesso"), 0);
    },
    onError: (e: Error) => setTimeout(() => toast.error(e.message), 0),
  });

  if (!tenant.active) {
    return <ColaboradoresSkeleton />;
  }

  const filteredData = data.filter((m) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
  });

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case "owner":
        return "default";
      case "admin":
        return "secondary";
      default:
        return "outline";
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Nunca acessou";
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <>
      <PageHeader
        title="Colaboradores"
        description="Gerencie os usuários e seus respectivos níveis de permissão dentro da instituição."
        actions={
          canAdmin && (
            <Button variant="outline" size="sm" asChild className="text-xs shadow-2xs">
              <Link href="/colaboradores/historico">
                <History className="mr-1.5 h-3.5 w-3.5" />
                Histórico de Alterações
              </Link>
            </Button>
          )
        }
      />
      <PageBody>
        <Card className="border-border/60 bg-card/60 shadow-2xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">
                  Membros da Equipe ({data.length})
                </CardTitle>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou e-mail..."
                  className="pl-8 h-8 text-xs bg-background/50"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <ColaboradoresCards
              data={filteredData}
              isLoading={isLoading}
              canAdmin={canAdmin}
              onEdit={setEditing}
              onRemove={remove.mutate}
              formatDate={formatDate}
              getRoleBadgeVariant={getRoleBadgeVariant}
            />

            <ColaboradoresTable
              data={filteredData}
              isLoading={isLoading}
              canAdmin={canAdmin}
              onEdit={setEditing}
              onRemove={remove.mutate}
              formatDate={formatDate}
              getRoleBadgeVariant={getRoleBadgeVariant}
            />
          </CardContent>
        </Card>
      </PageBody>

      {editing && (
        <EditMembershipDialog
          key={editing.membershipId}
          row={editing}
          institutionId={tenant.active.institutionId}
          onClose={() => setEditing(null)}
          onSave={save.mutate}
          isSaving={save.isPending}
        />
      )}
    </>
  );
}