"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, LayoutTemplate, Search, Loader2, Sparkles, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant";
import { isAdminLike } from "@/lib/roles";
import { PageBody, PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Template } from "@/lib/types/templates";
import { TemplateCard } from "@/components/template-card";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function TemplatesPage() {
  const tenant = useTenant();
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

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
        fields: (t.grade_template_fields as any[])
          .slice()
          .sort((a, b) => a.order_index - b.order_index),
      }));
    },
    enabled: !!tenant.active?.institutionId,
  });

  const createTpl = useMutation({
    mutationFn: async () => {
      if (!tenant.active) throw new Error("Sem instituição ativa selecionada.");
      const { error } = await supabase
        .from("grade_templates")
        .insert({ institution_id: tenant.active.institutionId, name: "Novo Template" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grade_templates"] });
      setTimeout(() => toast.success("Template de notas criado com sucesso!"), 0);
    },
    onError: (e: Error) => setTimeout(() => toast.error(e.message), 0),
  });

  const delTpl = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("grade_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grade_templates"] });
      setTimeout(() => toast.success("Template excluído com sucesso!"), 0);
    },
    onError: (e: Error) => setTimeout(() => toast.error(e.message), 0),
  });

  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      if (!tenant.active) throw new Error("Sem instituição ativa selecionada.");
      // Limpa o padrão existente antes
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
      setTimeout(() => toast.success("Template padrão atualizado!"), 0);
    },
    onError: (e: Error) => setTimeout(() => toast.error(e.message), 0),
  });

  if (!tenant.active) {
    return <TemplatesSkeleton />;
  }

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <>
      <PageHeader
        title="Templates de Notas"
        description="Defina a estrutura padrão dos diários de classe (avaliações, médias e regras de aprovação) para a instituição."
        actions={
          canEdit && (
            <Button
              size="sm"
              onClick={() => createTpl.mutate()}
              disabled={createTpl.isPending}
              className="text-xs shadow-2xs"
            >
              {createTpl.isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="mr-1.5 h-3.5 w-3.5" />
              )}
              Novo Template
            </Button>
          )
        }
      />
      <PageBody>
        <div className="space-y-6">
          {/* Card de Filtro e Header */}
          <Card className="border-border/60 bg-card/60 shadow-2xs">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <LayoutTemplate className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">
                    Modelos de Avaliação ({templates.length})
                  </CardTitle>
                </div>

                {/* Pesquisa */}
                {templates.length > 0 && (
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome do template..."
                      className="pl-8 h-8 text-xs bg-background/50"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-28 w-full rounded-xl" />
                  <Skeleton className="h-28 w-full rounded-xl" />
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground mb-3">
                    <FileSpreadsheet className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {searchQuery ? "Nenhum resultado encontrado" : "Nenhum template cadastrado"}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground max-w-sm leading-relaxed">
                    {searchQuery
                      ? "Nenhum modelo de notas atende ao termo pesquisado."
                      : "Crie modelos de avaliação com fórmulas personalizadas para padronizar os diários de classe."}
                  </p>
                  {canEdit && !searchQuery && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => createTpl.mutate()}
                      disabled={createTpl.isPending}
                      className="mt-4 text-xs shadow-2xs"
                    >
                      {createTpl.isPending ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" />
                      )}
                      Criar Primeiro Template
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTemplates.map((t) => (
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
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </>
  );
}

// Fallback de carregamento inicial
function TemplatesSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}
