"use client";

import { ROLE_LABELS, type AppRole } from "@/lib/roles";
import { type MembershipRow } from "../types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { Pencil, Trash2, Loader2 } from "lucide-react";

interface ColaboradoresTableProps {
  data: MembershipRow[];
  isLoading: boolean;
  canAdmin: boolean;
  onEdit: (row: MembershipRow) => void;
  onRemove: (id: string) => void;
  formatDate: (dateStr: string | null) => string;
  getRoleBadgeVariant: (role: AppRole) => "default" | "secondary" | "outline";
}

export function ColaboradoresTable({
  data,
  isLoading,
  canAdmin,
  onEdit,
  onRemove,
  formatDate,
  getRoleBadgeVariant,
}: ColaboradoresTableProps) {
  return (
    <div className="hidden md:block">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b border-border/50">
            <TableHead className="text-xs">Colaborador</TableHead>
            <TableHead className="text-xs">Perfil / Função</TableHead>
            <TableHead className="text-xs">Vínculos (Polos / Cursos)</TableHead>
            <TableHead className="text-xs">Último Acesso</TableHead>
            {canAdmin && <TableHead className="w-20 text-right text-xs">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                Carregando colaboradores...
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center text-xs text-muted-foreground">
                Nenhum colaborador encontrado para a busca especificada.
              </TableCell>
            </TableRow>
          ) : (
            data.map((m) => (
              <TableRow key={m.membershipId} className="hover:bg-muted/30 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 border border-border/60">
                      {m.avatar && <AvatarImage src={m.avatar} alt={m.name} />}
                      <AvatarFallback className="text-xs font-semibold">
                        {m.name?.[0]?.toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-foreground">{m.name}</span>
                      <span className="text-[11px] text-muted-foreground">{m.email}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getRoleBadgeVariant(m.role)} className="text-[11px] font-normal">
                    {ROLE_LABELS[m.role]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {m.polos.length === 0 && m.courses.length === 0 ? (
                    <span className="text-xs text-muted-foreground/60">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {m.polos.map((p) => (
                        <Badge key={p.id} variant="outline" className="text-[10px] py-0">
                          {p.name}
                        </Badge>
                      ))}
                      {m.courses.map((c) => (
                        <Badge key={c.id} variant="secondary" className="text-[10px] py-0">
                          {c.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(m.lastSignIn)}
                </TableCell>
                {canAdmin && (
                  <TableCell className="text-right">
                    {m.role !== "owner" && (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Editar permissões"
                          onClick={() => onEdit(m)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              title="Remover colaborador"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}