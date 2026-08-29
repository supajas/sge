import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Users,
  Calendar,
  Shield,
  MapPin,
  CheckCircle2,
  MapPinned,
  BookOpen,
  Layers,
  GraduationCap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getInstitutionDetailAction } from "../../actions";

interface InstitutionDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function InstitutionDetailPage({ params }: InstitutionDetailPageProps) {
  const { id } = await params;

  // getInstitutionDetailAction devolve o objeto INTEIRO como null quando a
  // instituição não existe — não um objeto com `institution: null` dentro.
  // Por isso é preciso checar o retorno inteiro ANTES de desestruturar,
  // senão `const { institution } = null` quebra com erro de runtime antes
  // mesmo de chegar no notFound().
  const detail = await getInstitutionDetailAction(id);

  if (!detail) {
    notFound();
  }

  const { institution, members, counts } = detail;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6 md:p-8">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" asChild>
              <Link href="/plataforma/instituicoes">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {institution.name}
            </h1>
            <Badge
              variant="outline"
              className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-600 dark:text-emerald-400"
            >
              <CheckCircle2 className="h-3 w-3" /> Ativa
            </Badge>
          </div>
          <p className="flex flex-wrap items-center gap-1.5 pl-10 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {institution.city && institution.state
              ? `${institution.city} / ${institution.state}`
              : "Localização não informada"}
            <span className="text-muted-foreground/50">·</span>
            <Calendar className="h-3 w-3" />
            Criada em{" "}
            {new Date(institution.created_at).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Estatísticas estruturais — a action já calculava isso (counts), mas
          a página nunca usava. Dá o resumo executivo de tamanho da
          instituição de relance, sem precisar entrar em cada módulo. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={MapPinned} label="Polos" value={counts.polos} />
        <StatCard icon={BookOpen} label="Cursos" value={counts.courses} />
        <StatCard icon={Layers} label="Turmas" value={counts.classes} />
        <StatCard icon={GraduationCap} label="Alunos" value={counts.students} />
      </div>

      {/* Membros — agora com nome/e-mail reais (via profiles), não mais o
          user_id cru que nunca existiu no retorno da action. */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-4">
          <div className="space-y-0.5">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-primary" /> Membros da Equipe
            </CardTitle>
            <CardDescription className="text-xs">
              {members.length} {members.length === 1 ? "vínculo ativo" : "vínculos ativos"} nesta instituição
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {members.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">Nenhum membro vinculado a esta instituição.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-8 w-8 shrink-0 border border-border/60">
                      <AvatarFallback className="text-xs font-semibold">
                        {member.name?.[0]?.toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{member.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="shrink-0 gap-1 border-border/60 bg-background/50 text-[11px] capitalize"
                  >
                    <Shield className="h-3 w-3 text-primary" />
                    {member.role}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-lg font-bold leading-none text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
