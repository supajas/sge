"use client";

import { useMemo, useState, ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Upload } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { z } from "zod";

type Status = "ativo" | "trancado" | "formado" | "evadido" | "transferido";
type Student = {
  id: string;
  registration: string;
  name: string;
  cpf: string | null;
  email: string | null;
  status: Status;
  class_id: string;
};

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "ativo", label: "Ativo" },
  { value: "trancado", label: "Trancado" },
  { value: "formado", label: "Formado" },
  { value: "evadido", label: "Evadido" },
  { value: "transferido", label: "Transferido" },
];

export default function AlunosPage() {
  const tenant = useTenant();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [search, setSearch] = useState("");

  const canEdit = tenant.active
    ? isAdminLike(tenant.active.role) || tenant.active.role === "coord_geral"
    : false;

  const { data: classes = [] } = useQuery({
    queryKey: ["classes-basic", tenant.active?.institutionId],
    queryFn: async () => {
      if (!tenant.active) return [];
      const { data, error } = await supabase
        .from("classes")
        .select("id, name, courses(name), polos(name)")
        .eq("institution_id", tenant.active.institutionId)
        .order("name");
      if (error) throw error;
      return (data ?? []).map((c) => ({
        id: c.id,
        label: `${(c.courses as { name: string })?.name ?? ""} · ${c.name} · ${
          (c.polos as { name: string })?.name ?? ""
        }`,
      }));
    },
    enabled: !!tenant.active?.institutionId,
  });

  const { data = [], isLoading } = useQuery({
    queryKey: ["students", tenant.active?.institutionId],
    queryFn: async () => {
      if (!tenant.active) return [];
      const { data, error } = await supabase
        .from("students")
        .select("id, registration, name, cpf, email, status, class_id")
        .eq("institution_id", tenant.active.institutionId)
        .order("name");
      if (error) throw error;
      return data as Student[];
    },
    enabled: !!tenant.active?.institutionId,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return data;
    return data.filter(
      (s) => s.name.toLowerCase().includes(q) || s.registration.toLowerCase().includes(q)
    );
  }, [data, search]);

  const save = useMutation({
    mutationFn: async (v: Omit<Student, "id">) => {
      if (!tenant.active) throw new Error("No active institution");
      const payload = { ...v, institution_id: tenant.active.institutionId };
      if (editing) {
        const { error } = await supabase.from("students").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("students").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      setFormOpen(false);
      setEditing(null);
      toast.success("Aluno salvo com sucesso.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      toast.success("Aluno excluído com sucesso.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importFn = useMutation({
    mutationFn: async (rows: Array<Omit<Student, "id">>) => {
      if (!tenant.active) throw new Error("No active institution");
      const { error } = await supabase
        .from("students")
        .insert(rows.map((r) => ({ ...r, institution_id: tenant.active!.institutionId })));
      if (error) throw error;
    },
    onSuccess: (_, rows) => {
      qc.invalidateQueries({ queryKey: ["students"] });
      setImportOpen(false);
      toast.success(`${rows.length} alunos importados com sucesso.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const classMap = useMemo(() => new Map(classes.map((c) => [c.id, c.label])), [classes]);

  if (!tenant.active) {
    return <div className="p-6"><p>Carregando...</p></div>;
  }

  return (
    <>
      <PageHeader
        title="Alunos"
        description="Registros acadêmicos dos alunos."
        actions={
          canEdit && (
            <div className="flex gap-2">
              <Dialog open={importOpen} onOpenChange={setImportOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Upload className="mr-1 h-4 w-4" /> Importar JSON
                  </Button>
                </DialogTrigger>
                <ImportDialog
                  classes={classes}
                  onImport={(rows) => importFn.mutate(rows)}
                  pending={importFn.isPending}
                />
              </Dialog>
              <Dialog
                open={formOpen}
                onOpenChange={(o) => {
                  setFormOpen(o);
                  if (!o) setEditing(null);
                }}
              >
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-1 h-4 w-4" /> Novo aluno
                  </Button>
                </DialogTrigger>
                <StudentForm
                  key={editing?.id}
                  editing={editing}
                  classes={classes}
                  onSubmit={(v) => save.mutate(v)}
                  pending={save.isPending}
                />
              </Dialog>
            </div>
          )
        }
      />
      <PageBody>
        <div className="mb-4">
          <Input
            placeholder="Buscar por nome ou matrícula..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <div>
          {/* Mobile View: Cards */}
          <div className="md:hidden">
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Carregando...</div>
            ) : filtered.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">Nenhum aluno encontrado.</div>
            ) : (
              <div className="space-y-4">
                {filtered.map((s) => (
                  <div key={s.id} className="rounded-lg border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{s.name}</span>
                      <Badge variant="secondary">
                        {STATUS_OPTIONS.find((x) => x.value === s.status)?.label}
                      </Badge>
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <p><span className="font-medium text-foreground">Matrícula:</span> {s.registration}</p>
                      <p><span className="font-medium text-foreground">Turma:</span> {classMap.get(s.class_id) ?? "—"}</p>
                    </div>
                    {canEdit && (
                      <div className="mt-4 flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditing(s);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" /> Editar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o aluno "{s.name}"? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => del.mutate(s.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden rounded-lg border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Status</TableHead>
                  {canEdit && <TableHead className="w-24 text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      Nenhum aluno encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.registration}</TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {classMap.get(s.class_id) ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {STATUS_OPTIONS.find((x) => x.value === s.status)?.label}
                        </Badge>
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditing(s);
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
                                  Tem certeza que deseja excluir o aluno "{s.name}"? Esta ação não
                                  pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => del.mutate(s.id)}>
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
        </div>
      </PageBody>
    </>
  );
}

function StudentForm({
  editing,
  classes,
  onSubmit,
  pending,
}: {
  editing: Student | null;
  classes: { id: string; label: string }[];
  onSubmit: (v: Omit<Student, "id">) => void;
  pending: boolean;
}) {
  const [reg, setReg] = useState(editing?.registration ?? "");
  const [name, setName] = useState(editing?.name ?? "");
  const [cpf, setCpf] = useState(editing?.cpf ?? "");
  const [email, setEmail] = useState(editing?.email ?? "");
  const [status, setStatus] = useState<Status>(editing?.status ?? "ativo");
  const [classId, setClassId] = useState<string>(editing?.class_id ?? "");
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{editing ? "Editar aluno" : "Novo aluno"}</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            registration: reg,
            name,
            cpf: cpf || null,
            email: email || null,
            status,
            class_id: classId,
          });
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="reg">Matrícula</Label>
            <Input id="reg" value={reg} onChange={(e) => setReg(e.target.value)} required />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="cpf">CPF</Label>
            <Input id="cpf" value={cpf ?? ""} onChange={(e) => setCpf(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email ?? ""}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label>Turma</Label>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={!reg || !name || !classId || pending}>
            {pending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

const studentSchema = z.object({
  registration: z.string().min(1),
  name: z.string().min(1),
  cpf: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  status: z.enum(["ativo", "trancado", "formado", "evadido", "transferido"]).default("ativo"),
});

const importSchema = z.array(studentSchema);

function ImportDialog({
  classes,
  onImport,
  pending,
}: {
  classes: { id: string; label: string }[];
  onImport: (rows: Array<Omit<Student, "id">>) => void;
  pending: boolean;
}) {
  const [classId, setClassId] = useState<string>("");
  const [fileContent, setFileContent] = useState<string>("");

  const example = `[
  { "registration": "2025001", "name": "Ana Souza", "cpf": "000.000.000-00", "email": "ana@ex.com", "status": "ativo" },
  { "registration": "2025002", "name": "Bruno Lima" }
]`;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      setFileContent(typeof text === 'string' ? text : '');
    };
    reader.readAsText(file);
  };

  function handleImport() {
    try {
      const parsed = JSON.parse(fileContent);
      const validated = importSchema.parse(parsed);
      
      const rows = validated.map((r) => ({
        ...r,
        class_id: classId,
      }));
      onImport(rows);
    } catch (e) {
      if (e instanceof z.ZodError) {
        console.error(e.errors);
        toast.error("Erro de validação no JSON. Verifique o formato e os campos.");
      } else {
        toast.error((e as Error).message);
      }
    }
  }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Importar alunos (JSON)</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div>
          <Label>1. Turma de destino</Label>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a turma para onde os alunos serão importados..." />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>2. Arquivo JSON</Label>
          <Input type="file" accept=".json" onChange={handleFileChange} />
          <p className="text-xs text-muted-foreground mt-2">
            O arquivo deve ser um array de objetos. Cada objeto deve conter no mínimo `registration` e `name`.
          </p>
        </div>
        <details className="text-xs">
          <summary className="cursor-pointer">Ver modelo do JSON</summary>
          <pre className="mt-2 rounded-md bg-muted p-4 text-muted-foreground whitespace-pre-wrap break-words">{example}</pre>
        </details>
      </div>
      <DialogFooter>
        <Button onClick={handleImport} disabled={!classId || !fileContent || pending}>
          {pending ? "Importando..." : "Importar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
