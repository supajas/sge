"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, GripVertical, Star } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant";
import { isAdminLike } from "@/lib/roles";
import { PageBody, PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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

type Field = {
  id: string;
  label: string;
  kind: "score" | "average" | "status";
  weight: number;
  max_value: number;
  order_index: number;
};

type Template = { id: string; name: string; is_default: boolean; fields: Field[] };

const KIND_LABEL: Record<Field["kind"], string> = {
  score: "Nota",
  average: "Média",
  status: "Situação",
};

export default function TemplatesPage() {
  const tenant = useTenant();
  const qc = useQueryClient();

  const canEdit = tenant.active ? isAdminLike(tenant.active.role) : false;

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["grade_templates", tenant.active?.institutionId],
    queryFn: async (): Promise<Template[]> => {
      if (!tenant.active) return [];
      const { data, error } = await supabase
        .from("grade_templates")
        .select(
          "id, name, is_default, grade_template_fields(id, label, kind, weight, max_value, order_index)"
        )
        .eq("institution_id", tenant.active.institutionId)
        .order("is_default", { ascending: false })
        .order("name");
      if (error) throw error;
      return (data ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        is_default: t.is_default,
        fields: (t.grade_template_fields as Field[])
          .slice()
          .sort((a, b) => a.order_index - b.order_index),
      }));
    },
    enabled: !!tenant.active?.institutionId,
  });

  const createTpl = useMutation({
    mutationFn: async () => {
      if (!tenant.active) throw new Error("No active institution");
      const { error } = await supabase
        .from("grade_templates")
        .insert({ institution_id: tenant.active.institutionId, name: "Novo template" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grade_templates"] });
      toast.success("Template criado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delTpl = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("grade_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grade_templates"] });
      toast.success("Template excluído");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      if (!tenant.active) throw new Error("No active institution");
      // Clear existing default first (unique partial index prevents two)
      await supabase
        .from("grade_templates")
        .update({ is_default: false })
        .eq("institution_id", tenant.active.institutionId)
        .eq("is_default", true)
        .neq("id", id);
      const { error } = await supabase.from("grade_templates").update({ is_default: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grade_templates"] });
      toast.success("Padrão atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!tenant.active) {
    return <div className="p-6"><p>Carregando...</p></div>;
  }

  return (
    <>
      <PageHeader
        title="Templates de Notas"
        description="Defina os campos padrão de avaliação (N1, N2, média, situação) usados em toda a instituição."
        actions={
          canEdit && (
            <Button size="sm" onClick={() => createTpl.mutate()} disabled={createTpl.isPending}>
              <Plus className="mr-1 h-4 w-4" /> Novo template
            </Button>
          )
        }
      />
      <PageBody>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum template cadastrado.</p>
        ) : (
          <div className="space-y-4">
            {templates.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                canEdit={canEdit}
                onDelete={() => delTpl.mutate(t.id)}
                onSetDefault={() => setDefault.mutate(t.id)}
              />
            ))}
          </div>
        )}
      </PageBody>
    </>
  );
}

function TemplateCard({
  template,
  canEdit,
  onDelete,
  onSetDefault,
}: {
  template: Template;
  canEdit: boolean;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(template.name);

  const renameTpl = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("grade_templates").update({ name }).eq("id", template.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grade_templates"] });
      toast.success("Nome atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addField = useMutation({
    mutationFn: async () => {
      const nextOrder = (template.fields[template.fields.length - 1]?.order_index ?? 0) + 1;
      const { error } = await supabase.from("grade_template_fields").insert({
        template_id: template.id,
        label: "Novo campo",
        kind: "score",
        weight: 1,
        max_value: 10,
        order_index: nextOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["grade_templates"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const updField = useMutation({
    mutationFn: async (f: Partial<Field> & { id: string }) => {
      const { id, ...patch } = f;
      const { error } = await supabase.from("grade_template_fields").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["grade_templates"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const delField = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("grade_template_fields").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["grade_templates"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            {canEdit ? (
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => name !== template.name && renameTpl.mutate()}
                className="h-8 max-w-xs font-semibold"
              />
            ) : (
              <CardTitle className="text-base">{template.name}</CardTitle>
            )}
            {template.is_default && (
              <Badge variant="secondary" className="gap-1">
                <Star className="h-3 w-3" /> Padrão
              </Badge>
            )}
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            {!template.is_default && (
              <Button size="sm" variant="outline" onClick={onSetDefault}>
                Tornar padrão
              </Button>
            )}
            {!template.is_default && (
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
                      Tem certeza que deseja excluir o template "{template.name}"? Esta ação não
                      pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete}>Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <div className="grid grid-cols-[24px_1fr_140px_100px_100px_40px] gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
            <span />
            <span>Rótulo</span>
            <span>Tipo</span>
            <span>Peso</span>
            <span>Máx</span>
            <span />
          </div>
          {template.fields.map((f) => (
            <div
              key={f.id}
              className="grid grid-cols-[24px_1fr_140px_100px_100px_40px] items-center gap-2 border-b px-3 py-2 last:border-b-0"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              {canEdit ? (
                <>
                  <Input
                    defaultValue={f.label}
                    onBlur={(e) =>
                      e.target.value !== f.label && updField.mutate({ id: f.id, label: e.target.value })
                    }
                    className="h-8"
                  />
                  <Select
                    value={f.kind}
                    onValueChange={(v) => updField.mutate({ id: f.id, kind: v as Field["kind"] })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="score">Nota</SelectItem>
                      <SelectItem value="average">Média</SelectItem>
                      <SelectItem value="status">Situação</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    step="0.1"
                    defaultValue={f.weight}
                    onBlur={(e) =>
                      Number(e.target.value) !== f.weight &&
                      updField.mutate({ id: f.id, weight: Number(e.target.value) })
                    }
                    className="h-8"
                    disabled={f.kind !== "score"}
                  />
                  <Input
                    type="number"
                    step="0.1"
                    defaultValue={f.max_value}
                    onBlur={(e) =>
                      Number(e.target.value) !== f.max_value &&
                      updField.mutate({ id: f.id, max_value: Number(e.target.value) })
                    }
                    className="h-8"
                    disabled={f.kind === "status"}
                  />
                  <Button size="icon" variant="ghost" onClick={() => delField.mutate(f.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-sm">{f.label}</span>
                  <span className="text-sm text-muted-foreground">{KIND_LABEL[f.kind]}</span>
                  <span className="text-sm">{f.kind === "score" ? f.weight : "—"}</span>
                  <span className="text-sm">{f.kind === "status" ? "—" : f.max_value}</span>
                  <span />
                </>
              )}
            </div>
          ))}
        </div>
        {canEdit && (
          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={() => addField.mutate()}>
              <Plus className="mr-1 h-4 w-4" /> Adicionar campo
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
