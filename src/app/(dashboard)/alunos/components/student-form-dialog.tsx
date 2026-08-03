"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, User, Mail, IdCard, Hash, CheckCircle2, UserX, Lock, ArrowLeftRight, GraduationCap } from "lucide-react";

import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Student, Status } from "@/lib/types/students";
import { cn } from "@/lib/utils";

const studentSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  registration: z.string().min(1, "Matrícula é obrigatória"),
  cpf: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  class_id: z.string().min(1, "Turma é obrigatória"),
  // Precisa bater com o tipo `Status` de @/lib/types/students (fonte da verdade):
  // "ativo" | "trancado" | "formado" | "evadido" | "transferido".
  status: z.enum(["ativo", "trancado", "formado", "evadido", "transferido"]),
});

type StudentFormValues = z.infer<typeof studentSchema>;

interface StudentFormDialogProps {
  editing?: Student | null;
  classes: Array<{ id: string; label: string }>;
  defaultClassId?: string;
  // Formato já normalizado: cpf/email como string | null (nunca undefined),
  // pronto para ir direto para saveStudentAction.
  onSubmit: (values: Omit<Student, "id"> & { id?: string }) => void;
  pending: boolean;
}

const STATUS_CARDS = [
  { value: "ativo", label: "Ativo", icon: CheckCircle2, activeColor: "border-emerald-500/50 bg-emerald-500/10 text-emerald-500" },
  { value: "trancado", label: "Trancado", icon: Lock, activeColor: "border-amber-500/50 bg-amber-500/10 text-amber-500" },
  { value: "formado", label: "Formado", icon: GraduationCap, activeColor: "border-purple-500/50 bg-purple-500/10 text-purple-500" },
  { value: "evadido", label: "Evadido", icon: UserX, activeColor: "border-rose-500/50 bg-rose-500/10 text-rose-500" },
  { value: "transferido", label: "Transferido", icon: ArrowLeftRight, activeColor: "border-blue-500/50 bg-blue-500/10 text-blue-500" },
] as const;

export function StudentFormDialog({
  editing,
  classes,
  defaultClassId,
  onSubmit,
  pending,
}: StudentFormDialogProps) {
  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      id: editing?.id,
      name: editing?.name ?? "",
      registration: editing?.registration ?? "",
      cpf: editing?.cpf ?? "",
      email: editing?.email ?? "",
      class_id: editing?.class_id ?? defaultClassId ?? "",
      status: editing?.status ?? "ativo",
    },
  });

  useEffect(() => {
    if (editing) {
      form.reset({
        id: editing.id,
        name: editing.name,
        registration: editing.registration,
        cpf: editing.cpf ?? "",
        email: editing.email ?? "",
        class_id: editing.class_id,
        status: editing.status,
      });
    }
  }, [editing, form]);

  const currentStatus = form.watch("status");

  return (
    <DialogContent className="sm:max-w-[500px] overflow-hidden p-0 gap-0 border-border/80 shadow-2xl">
      <DialogHeader className="p-6 pb-4 border-b border-border/40 bg-card">
        <DialogTitle className="flex items-center gap-2 text-base font-semibold">
          <User className="h-4 w-4 text-primary" />
          {editing ? "Editar Dados do Aluno" : "Cadastrar Novo Aluno"}
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          {editing
            ? "Atualize as informações cadastrais e o status da matrícula."
            : "Preencha os dados abaixo para vincular o estudante à turma."}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((v) =>
            onSubmit({
              id: v.id,
              name: v.name,
              registration: v.registration,
              // "" -> null aqui, pois Student.cpf/email são string | null, nunca undefined/"".
              cpf: v.cpf ? v.cpf : null,
              email: v.email ? v.email : null,
              class_id: v.class_id,
              status: v.status,
            })
          )}
          className="space-y-4 p-6 bg-card/40"
        >
          {/* Nome Completo */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-xs font-medium">Nome Completo</FormLabel>
                <FormControl>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Ex: João da Silva" className="pl-9 text-xs h-9" {...field} />
                  </div>
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />

          {/* Matrícula e CPF */}
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="registration"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-medium">Matrícula</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Hash className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="20261001" className="pl-9 text-xs h-9 font-mono" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cpf"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-medium">CPF (opcional)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <IdCard className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="000.000.000-00" className="pl-9 text-xs h-9 font-mono" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />
          </div>

          {/* E-mail */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-xs font-medium">E-mail (opcional)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="email" placeholder="aluno@exemplo.com" className="pl-9 text-xs h-9" {...field} />
                  </div>
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />

          {/* Seleção da Turma (com Truncate Seguro) */}
          <FormField
            control={form.control}
            name="class_id"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-xs font-medium">Turma de Destino</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full text-xs h-9 bg-background/50 truncate">
                      <SelectValue placeholder="Selecione uma turma" className="truncate" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-w-[450px]">
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs truncate">
                        <span className="truncate block max-w-[400px]">{c.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />

          {/* Status em Seletor de Cards Interativos */}
          <div className="space-y-1.5 pt-1">
            <FormLabel className="text-xs font-medium">Status da Matrícula</FormLabel>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_CARDS.map((card) => {
                const Icon = card.icon;
                const isSelected = currentStatus === card.value;

                return (
                  <button
                    key={card.value}
                    type="button"
                    onClick={() => form.setValue("status", card.value as Status)}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition-all",
                      isSelected
                        ? cn("font-semibold shadow-2xs", card.activeColor)
                        : "border-border/60 bg-background/40 hover:bg-muted/50 text-muted-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{card.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-border/40">
            <Button type="submit" size="sm" disabled={pending} className="w-full sm:w-auto">
              {pending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              {editing ? "Salvar Alterações" : "Cadastrar Aluno"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}