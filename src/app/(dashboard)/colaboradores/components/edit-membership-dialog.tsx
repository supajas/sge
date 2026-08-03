"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { type AppRole } from "@/lib/roles";
import { type MembershipRow } from "../types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface EditMembershipDialogProps {
  row: MembershipRow;
  institutionId: string;
  onClose: () => void;
  onSave: (vars: {
    membership_id: string;
    role: AppRole;
    polo_ids: string[];
    course_ids: string[];
  }) => void;
  isSaving: boolean;
}

export function EditMembershipDialog({
  row,
  institutionId,
  onClose,
  onSave,
  isSaving,
}: EditMembershipDialogProps) {
  const [role, setRole] = useState<AppRole>(row.role);
  const [selectedPolos, setSelectedPolos] = useState<string[]>(row.polos.map((p) => p.id));
  const [selectedCourses, setSelectedCourses] = useState<string[]>(row.courses.map((c) => c.id));

  // Polos e Cursos agora ficam disponíveis para configuração de escopos operacionais
  const isInstitutionalRole = ["owner", "admin", "secretaria"].includes(role);
  const showPolos = !isInstitutionalRole;
  const showCourses = !isInstitutionalRole;

  const { data: polos = [], isLoading: polosLoading } = useQuery({
    queryKey: ["polos-all", institutionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("polos")
        .select("id, name")
        .eq("institution_id", institutionId)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: showPolos,
  });

  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ["courses-all", institutionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, name")
        .eq("institution_id", institutionId)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: showCourses,
  });

  const toggleAllPolos = () => {
    if (selectedPolos.length === polos.length) {
      setSelectedPolos([]);
    } else {
      setSelectedPolos(polos.map((p) => p.id));
    }
  };

  const toggleAllCourses = () => {
    if (selectedCourses.length === courses.length) {
      setSelectedCourses([]);
    } else {
      setSelectedCourses(courses.map((c) => c.id));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Editar Perfil do Colaborador</DialogTitle>
          <DialogDescription className="text-xs">
            Altere as permissões de acesso e o perfil de <strong>{row.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Perfil de Acesso</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin" className="text-xs">Administrador</SelectItem>
                <SelectItem value="coord_geral" className="text-xs">Coordenador Geral</SelectItem>
                <SelectItem value="secretaria" className="text-xs">Secretária</SelectItem>
                <SelectItem value="coord_curso" className="text-xs">Coordenador de Curso</SelectItem>
                <SelectItem value="coord_polo" className="text-xs">Coordenador de Polo</SelectItem>
                <SelectItem value="professor" className="text-xs">Professor</SelectItem>
                <SelectItem value="tutor_presencial" className="text-xs">Tutor Presencial</SelectItem>
                <SelectItem value="tutor_distancia" className="text-xs">Tutor a Distância</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showPolos && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Polos Vinculados</Label>
                {polos.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-[11px] text-primary hover:text-primary/80"
                    onClick={toggleAllPolos}
                  >
                    {selectedPolos.length === polos.length ? "Desmarcar todos" : "Marcar todos"}
                  </Button>
                )}
              </div>

              <div className="max-h-36 space-y-2 overflow-y-auto rounded-md border border-border/60 bg-background/50 p-3">
                {polosLoading ? (
                  <div className="flex items-center justify-center py-4 text-xs text-muted-foreground">
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Carregando polos...
                  </div>
                ) : polos.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    Nenhum polo cadastrado na instituição.
                  </p>
                ) : (
                  polos.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-xs font-normal cursor-pointer select-none">
                      <Checkbox
                        checked={selectedPolos.includes(p.id)}
                        onCheckedChange={(v) =>
                          setSelectedPolos((cur) => (v ? [...cur, p.id] : cur.filter((x) => x !== p.id)))
                        }
                      />
                      <span className="text-foreground">{p.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {showCourses && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Cursos Vinculados</Label>
                {courses.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-[11px] text-primary hover:text-primary/80"
                    onClick={toggleAllCourses}
                  >
                    {selectedCourses.length === courses.length ? "Desmarcar todos" : "Marcar todos"}
                  </Button>
                )}
              </div>

              <div className="max-h-36 space-y-2 overflow-y-auto rounded-md border border-border/60 bg-background/50 p-3">
                {coursesLoading ? (
                  <div className="flex items-center justify-center py-4 text-xs text-muted-foreground">
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Carregando cursos...
                  </div>
                ) : courses.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    Nenhum curso cadastrado na instituição.
                  </p>
                ) : (
                  courses.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-xs font-normal cursor-pointer select-none">
                      <Checkbox
                        checked={selectedCourses.includes(c.id)}
                        onCheckedChange={(v) =>
                          setSelectedCourses((cur) => (v ? [...cur, c.id] : cur.filter((x) => x !== c.id)))
                        }
                      />
                      <span className="text-foreground">{c.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={isSaving}
            onClick={() =>
              onSave({
                membership_id: row.membershipId,
                role: role,
                polo_ids: showPolos ? selectedPolos : [],
                course_ids: showCourses ? selectedCourses : [],
              })
            }
            className="text-xs"
          >
            {isSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}