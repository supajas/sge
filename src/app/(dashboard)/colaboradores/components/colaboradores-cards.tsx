"use client";

import { ROLE_LABELS, type AppRole } from "@/lib/roles";
import { type MembershipRow } from "../types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="space-y-3 p-3 md:hidden">
      {isLoading ? (
        <>
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </>
      ) : data.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted-foreground">
          Nenhum colaborador encontrado.
        </div>
      ) : (
        data.map((m) => (
          <Card key={m.membershipId} className="border-border/60 bg-card/80 shadow-2xs">
            <CardContent className="p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-9 w-9 shrink-0 border border-border/60">
                    {m.avatar && <AvatarImage src={m.avatar} alt={m.name} />}
                    <AvatarFallback className="text-xs font-semibold">
                      {m.name?.[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium leading-none text-foreground">{m.name}</p>
                    <p className="truncate text-xs text-muted-foreground mt-1">{m.email}</p>
                  </div>
                </div>

                {canAdmin && m.role !== "owner" && (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => onEdit(m)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="sr-only">Editar</span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Remover</span>
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

              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant={getRoleBadgeVariant(m.role)} className="text-[10px] capitalize">
                  {ROLE_LABELS[m.role]}
                </Badge>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Acesso: {formatDate(m.lastSignIn)}
                </span>
              </div>

              {m.polos.length > 0 && (
                <div className="flex items-start gap-1.5">
                  <Building2 className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
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
                <div className="flex items-start gap-1.5">
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
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
