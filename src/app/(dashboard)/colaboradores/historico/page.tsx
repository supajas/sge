"use client";

import { createFileRoute, Link, redirect } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useActiveTenant } from "@/lib/tenant";
import { isAdminLike, ROLE_LABELS, type AppRole } from "@/lib/roles";
import { PageBody, PageHeader } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/colaboradores/historico")({
  component: HistoryPage,
});

type ActionType = "invite_redeemed" | "role_changed" | "polos_changed" | "removed";

const ACTION_LABELS: Record<ActionType, string> = {
  invite_redeemed: "Convite aceito",
  role_changed: "Perfil alterado",
  polos_changed: "Polos alterados",
  removed: "Removido",
};

const ACTION_VARIANTS: Record<ActionType, "default" | "secondary" | "outline" | "destructive"> = {
  invite_redeemed: "default",
  role_changed: "secondary",
  polos_changed: "outline",
  removed: "destructive",
};

type Row = {
  id: string;
  action: ActionType;
  createdAt: string;
  actorName: string | null;
  targetName: string;
  previousRole: AppRole | null;
  newRole: AppRole | null;
  previousPolos: string[];
  newPolos: string[];
};

export default function Page() {
  const active = useActiveTenant();
  if (!isAdminLike(active.role)) {
    throw redirect({ to: "/colaboradores" });
  }

  const { data = [], isLoading } = useQuery<Row[]>({
    queryKey: ["approval-history", active.institutionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_history")
        .select("id, action, created_at, actor_user_id, target_user_id, previous_role, new_role, previous_polo_ids, new_polo_ids")
        .eq("institution_id", active.institutionId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const rows = data ?? [];
      const userIds = Array.from(
        new Set(rows.flatMap((r) => [r.actor_user_id, r.target_user_id]).filter((x): x is string => !!x)),
      );
      const poloIds = Array.from(
        new Set(rows.flatMap((r) => [...(r.previous_polo_ids ?? []), ...(r.new_polo_ids ?? [])])),
      );
      const [profilesRes, polosRes] = await Promise.all([
        userIds.length
          ? supabase.from("profiles").select("id, full_name, email").in("id", userIds)
          : Promise.resolve({ data: [] as { id: string; full_name: string; email: string }[] }),
        poloIds.length
          ? supabase.from("polos").select("id, name").in("id", poloIds)
          : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      ]);
      const nameById: Record<string, string> = {};
      for (const p of profilesRes.data ?? []) nameById[p.id] = p.full_name ?? p.email ?? "—";
      const poloById: Record<string, string> = {};
      for (const p of polosRes.data ?? []) poloById[p.id] = p.name;
      return rows.map((r) => ({
        id: r.id,
        action: r.action as ActionType,
        createdAt: r.created_at,
        actorName: r.actor_user_id ? nameById[r.actor_user_id] ?? "—" : null,
        targetName: nameById[r.target_user_id] ?? "—",
        previousRole: (r.previous_role as AppRole | null) ?? null,
        newRole: (r.new_role as AppRole | null) ?? null,
        previousPolos: (r.previous_polo_ids ?? []).map((id: string) => poloById[id] ?? "?"),
        newPolos: (r.new_polo_ids ?? []).map((id: string) => poloById[id] ?? "?"),
      }));
    },
  });

  return (
    <>
      <PageHeader
        title="Histórico de aprovações"
        description="Convites aceitos e alterações de acesso feitas pela equipe."
        actions={
          <Button variant="outline" asChild>
            <Link to="/colaboradores">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
        }
      />
      <PageBody>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>Alteração</TableHead>
                <TableHead>Por</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Carregando...</TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Nenhum evento ainda.</TableCell>
                </TableRow>
              ) : (
                data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ACTION_VARIANTS[r.action]}>{ACTION_LABELS[r.action]}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{r.targetName}</TableCell>
                    <TableCell className="text-sm">
                      <ChangeSummary row={r} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.actorName ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </PageBody>
    </>
  );
}

function ChangeSummary({ row }: { row: Row }) {
  if (row.action === "invite_redeemed") {
    return (
      <span>
        Entrou como <strong>{row.newRole ? ROLE_LABELS[row.newRole] : "—"}</strong>
        {row.newPolos.length > 0 && <> · Polos: {row.newPolos.join(", ")}</>}
      </span>
    );
  }
  if (row.action === "role_changed") {
    return (
      <span>
        <strong>{row.previousRole ? ROLE_LABELS[row.previousRole] : "—"}</strong>
        {" → "}
        <strong>{row.newRole ? ROLE_LABELS[row.newRole] : "—"}</strong>
      </span>
    );
  }
  if (row.action === "polos_changed") {
    return (
      <span>
        Polos: {row.previousPolos.join(", ") || "—"} → {row.newPolos.join(", ") || "—"}
      </span>
    );
  }
  return <span className="text-muted-foreground">Acesso removido</span>;
}
