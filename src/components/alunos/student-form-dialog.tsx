"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Student, Status, STATUS_OPTIONS } from "@/lib/types/students";

type Props = {
  editing: Student | null;
  classes: { id: string; label: string }[];
  defaultClassId: string;
  onSubmit: (v: Omit<Student, "id">) => void;
  pending: boolean;
};

export function StudentFormDialog({
  editing,
  classes,
  defaultClassId,
  onSubmit,
  pending,
}: Props) {
  const [reg, setReg] = useState(editing?.registration ?? "");
  const [name, setName] = useState(editing?.name ?? "");
  const [cpf, setCpf] = useState(editing?.cpf ?? "");
  const [email, setEmail] = useState(editing?.email ?? "");
  const [status, setStatus] = useState<Status>(editing?.status ?? "ativo");
  const [classId, setClassId] = useState<string>(editing?.class_id ?? defaultClassId);

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
