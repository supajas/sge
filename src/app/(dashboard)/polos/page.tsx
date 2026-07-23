"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant";
import { isAdminLike } from "@/lib/roles";
import { PageBody, PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

type Polo = { id: string; name: string; city: string | null; state: string | null };

export default function PolosPage() {
  const tenant = useTenant();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Polo | null>(null);

  const canEdit = tenant.active ? isAdminLike(tenant.active.role) : false;

  const { data = [], isLoading } = useQuery({
    queryKey: ["polos", tenant.active?.institutionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("polos")
        .select("id, name, city, state")
        .eq("institution_id", tenant.active!.institutionId)
        .order("name");
      if (error) throw error;
      return data as Polo[];
    },
    enabled: !!tenant.active?.institutionId,
  });

  const save = useMutation({
    mutationFn: async (v: { name: string; city: string; state: string }) => {
      if (!tenant.active) throw new Error("No active institution");
      if (editing) {
        const { error } = await supabase.from("polos").update(v).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("polos")
          .insert({ ...v, institution_id: tenant.active.institutionId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["polos"] });
      setFormOpen(false);
      setEditing(null);
      toast.success("Polo salvo com sucesso.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("polos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["polos"] });
      toast.success("Polo excluído com sucesso.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!tenant.active) {
    return (
      <div className="p-6">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Polos"
        description="Unidades físicas da instituição."
        actions={
          canEdit && (
            <Dialog
              open={formOpen}
              onOpenChange={(o) => {
                setFormOpen(o);
                if (!o) setEditing(null);
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-1 h-4 w-4" /> Novo polo
                </Button>
              </DialogTrigger>
              <PoloForm
                key={editing?.id} // Re-mount form when editing changes
                editing={editing}
                onSubmit={(v) => save.mutate(v)}
                pending={save.isPending}
              />
            </Dialog>
          )
        }
      />
      <PageBody>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Estado</TableHead>
                {canEdit && <TableHead className="w-24 text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Nenhum polo cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.city ?? "—"}</TableCell>
                    <TableCell>{p.state ?? "—"}</TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditing(p);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o polo "{p.name}"? Esta ação não
                                pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => del.mutate(p.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    )}
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

function PoloForm({
  editing,
  onSubmit,
  pending,
}: {
  editing: Polo | null;
  onSubmit: (v: { name: string; city: string; state: string }) => void;
  pending: boolean;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [city, setCity] = useState(editing?.city ?? "");
  const [state, setState] = useState(editing?.state ?? "");
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{editing ? "Editar polo" : "Novo polo"}</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ name, city, state });
        }}
        className="space-y-4"
      >
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="city">Cidade</Label>
            <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="state">Estado</Label>
            <Input id="state" value={state} onChange={(e) => setState(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={!name || pending}>
            {pending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
