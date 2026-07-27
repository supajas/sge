"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, GripVertical, Star, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
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
import { Field, Template, KIND_LABEL } from "@/lib/types/templates";
import { reorderTemplateFieldsAction } from "@/app/(dashboard)/templates-notas/actions";

export function TemplateCard({
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
  const [fields, setFields] = useState(template.fields);

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
      const nextOrder = (fields[fields.length - 1]?.order_index ?? 0) + 1;
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

  const reorder = useMutation({
    mutationFn: reorderTemplateFieldsAction,
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["grade_templates"] });
      const previousTemplates = qc.getQueryData<Template[]>(["grade_templates"]);

      // Optimistically update the UI
      const newFields = [...fields];
      const fromIndex = newFields.findIndex(f => f.id === vars.field_id);
      const toIndex = vars.direction === 'up' ? fromIndex - 1 : fromIndex + 1;
      const [movedItem] = newFields.splice(fromIndex, 1);
      newFields.splice(toIndex, 0, movedItem);
      setFields(newFields);

      return { previousTemplates };
    },
    onError: (err, vars, context) => {
      toast.error(err.message);
      if (context?.previousTemplates) {
        qc.setQueryData(["grade_templates"], context.previousTemplates);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["grade_templates"] });
    },
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
        {/* Mobile View: list of fields */}
        <div className="md:hidden">
          <div className="space-y-3">
            {fields.map((f, index) => (
              <div key={f.id} className="rounded-lg border bg-muted/30 p-3">
                {canEdit ? (
                  <>
                    <div className="flex items-center justify-between">
                      <Input
                        defaultValue={f.label}
                        onBlur={(e) => e.target.value !== f.label && updField.mutate({ id: f.id, label: e.target.value })}
                        className="h-8 flex-1 font-medium"
                      />
                      <div className="flex">
                        <Button size="icon" variant="ghost" disabled={index === 0} onClick={() => reorder.mutate({ template_id: template.id, field_id: f.id, direction: 'up' })}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" disabled={index === fields.length - 1} onClick={() => reorder.mutate({ template_id: template.id, field_id: f.id, direction: 'down' })}>
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => delField.mutate(f.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Tipo</Label>
                        <Select
                          value={f.kind}
                          onValueChange={(v) => updField.mutate({ id: f.id, kind: v as Field["kind"] })}
                        >
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="score">Nota</SelectItem>
                            <SelectItem value="average">Média</SelectItem>
                            <SelectItem value="status">Situação</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Peso</Label>
                        <Input
                          type="number" step="0.1" defaultValue={f.weight}
                          onBlur={(e) => Number(e.target.value) !== f.weight && updField.mutate({ id: f.id, weight: Number(e.target.value) })}
                          className="h-8" disabled={f.kind !== "score"}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Máx</Label>
                        <Input
                          type="number" step="0.1" defaultValue={f.max_value}
                          onBlur={(e) => Number(e.target.value) !== f.max_value && updField.mutate({ id: f.id, max_value: Number(e.target.value) })}
                          className="h-8" disabled={f.kind === "status"}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-medium">{f.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {KIND_LABEL[f.kind]}
                      {f.kind === 'score' && ` · Peso: ${f.weight}`}
                      {f.kind !== 'status' && ` · Máx: ${f.max_value}`}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Desktop View: grid table */}
        <div className="hidden rounded-md border md:block">
          <div className="grid grid-cols-[auto_1fr_140px_100px_100px_40px] gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
            <span />
            <span>Rótulo</span>
            <span>Tipo</span>
            <span>Peso</span>
            <span>Máx</span>
            <span />
          </div>
          {fields.map((f, index) => (
            <div
              key={f.id}
              className="grid grid-cols-[auto_1fr_140px_100px_100px_40px] items-center gap-2 border-b px-3 py-2 last:border-b-0"
            >
              <div className="flex">
                <Button size="icon" variant="ghost" className="h-8 w-6" disabled={index === 0} onClick={() => reorder.mutate({ template_id: template.id, field_id: f.id, direction: 'up' })}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-6" disabled={index === fields.length - 1} onClick={() => reorder.mutate({ template_id: template.id, field_id: f.id, direction: 'down' })}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
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
