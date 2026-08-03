"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface BreadcrumbsProps {
  course?: string | null;
  polo?: string | null;
  klass?: string | null;
  period?: string | null;
  subject?: string | null;
  institutionId?: string;
}

export function Breadcrumbs({
  course,
  polo,
  klass,
  period,
  subject,
  institutionId,
}: BreadcrumbsProps) {
  const { data: names = {} } = useQuery({
    queryKey: ["notas-names", institutionId, course, polo, klass, period, subject],
    queryFn: async () => {
      const out: Record<string, string> = {};
      const ids = [course, polo, klass, period, subject].filter(Boolean);
      if (!ids.length) return out;

      const [c, p, cl, pr, s] = await Promise.all([
        course
          ? supabase.from("courses").select("id, name").eq("id", course).maybeSingle()
          : null,
        polo ? supabase.from("polos").select("id, name").eq("id", polo).maybeSingle() : null,
        klass ? supabase.from("classes").select("id, name").eq("id", klass).maybeSingle() : null,
        period ? supabase.from("periods").select("id, name").eq("id", period).maybeSingle() : null,
        subject
          ? supabase.from("subjects").select("id, name").eq("id", subject).maybeSingle()
          : null,
      ]);

      if (c?.data) out[c.data.id] = c.data.name;
      if (p?.data) out[p.data.id] = p.data.name;
      if (cl?.data) out[cl.data.id] = cl.data.name;
      if (pr?.data) out[pr.data.id] = pr.data.name;
      if (s?.data) out[s.data.id] = s.data.name;
      return out;
    },
    enabled: !!institutionId,
  });

  const crumbs = [
    { key: "curso", id: course, label: "Curso" },
    { key: "polo", id: polo, label: "Polo" },
    { key: "turma", id: klass, label: "Turma" },
    { key: "periodo", id: period, label: "Período" },
    { key: "disc", id: subject, label: "Disciplina" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
      <Link href="/notas" className="hover:text-foreground">
        Início
      </Link>
      {crumbs.map((c) =>
        c.id ? (
          <span key={c.key} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">{names[c.id] ?? c.label}</span>
          </span>
        ) : null
      )}
    </div>
  );
}