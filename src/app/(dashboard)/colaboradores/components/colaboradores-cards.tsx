"use client";

import { ROLE_LABELS, type AppRole } from "@/lib/roles";
import { type MembershipRow } from "../types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Calendar, Building2, BookOpen } from "lucide-react";

interface ColaboradoresCardsProps {
  data: MembershipRow[];
  isLoading: boolean;
  canAdmin: boolean;
  onEdit: (row: MembershipRow) => void;
  onRemove: (id: string) => void;
  formatDate: (dateStr: string | null) => string;
  getRoleBadgeVariant: (role: AppRole) => "default" | "secondary" | "outline";
}

export function ColaboradoresCards({
  data,
  isLoading,
  canAdmin,
  onEdit,
  onRemove,
  formatDate,
  getRoleBadgeVariant,
}: ColaboradoresCardsProps) {
  return (
    <div className="block md:hidden divide-y divide-border/40">
      {isLoading ? (
        <div className="p-4 space-y-3">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      ) : data.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted-foreground">
          Nenhum colaborador encontrado.
        </div>
      ) : (
        data.map((m) => (
          <div key={m.membershipId} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 border border-border/60">
                  {m.avatar && <AvatarImage src={m.avatar} alt={m.name} />}
                  <AvatarFallback className="text-xs font-semibold">
                    {m.name?.[0]?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium leading-none text-foreground">{m.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{m.email}</p>
                </div>
              </div>
              <Badge variant={getRoleBadgeVariant(m.role)} className="text-[10px] capitalize">
                {ROLE_LABELS[m.role]}
              </Badge>
            </div>

            <div className="flex flex-col gap-1.5 text-xs text-muted-foreground pt-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                <span>Acesso: {formatDate(m.lastSignIn)}</span>
              </div>

              {m.polos.length > 0 && (
                <div className="flex items-start gap-1.5 mt-1">
                  <Building2 className="h-3 w-3 mt-0.5 shrink-0" />
                  <div className="flex flex-wrap gap-1">
                    {m.polos.map((p) => (
                      <Badge key={p.id} variant="outline" className="text-[10px] py-0 px-1.5">
                        {p.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {m.courses.length > 0 && (
                <div className="flex items-start gap-1.5 mt-1">
                  <BookOpen className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                  <div className="flex flex-wrap gap-1">
                    {m.courses.map((c) => (
                      <Badge key={c.id} variant="secondary" className="text-[10px] py-0 px-1.5">
                        {c.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {canAdmin && m.role !== "owner" && (
              <div className="pt-2 flex justify-end gap-2 border-t border-border/30">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(m)}
                  className="h-7 text-xs"
                >
                  <Pencil className="mr-1.5 h-3 w-3" /> Editar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive" className="h-7 text-xs">
                      <Trash2 className="mr-1.5 h-3 w-3" /> Remover
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja remover o acesso de <strong>{m.name}</strong> a esta instituição?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onRemove(m.membershipId)}>
                        Confirmar Remoção
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}