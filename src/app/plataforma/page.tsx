import Link from "next/link";
import {
  Building2,
  Users,
  ScrollText,
  ArrowUpRight,
  Clock,
  ShieldCheck,
  ChevronRight,
  MapPin,
  Calendar,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPlatformOverviewAction } from "./actions";

export default async function PlataformaPage() {
  const stats = await getPlatformOverviewAction();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 p-6 md:p-8">
      {/* Header Executivo — removido o botão "Nova Instituição" (levava
          para /plataforma/instituicoes/nova, rota que ainda não existe). */}
      <div className="flex flex-col gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Visão Geral da Plataforma
            </h1>
            <Badge variant="outline" className="gap-1.5 border-primary/30 bg-primary/5 font-mono text-xs text-primary">
              <ShieldCheck className="h-3.5 w-3.5" /> Admin
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Painel de controle para governança global de instâncias, auditoria e permissões.
          </p>
        </div>
      </div>

      {/* Grid de KPIs / Métricas Globais */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
        <Card className="relative overflow-hidden border-border/60 bg-card/60 backdrop-blur-sm transition-all hover:border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total de Instituições
            </CardTitle>
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <Building2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-bold tracking-tight text-foreground">
                {stats.totalInstitutions}
              </div>
              <Badge variant="secondary" className="gap-1 bg-muted/60 text-[10px] font-normal">
                <Activity className="h-3 w-3 text-emerald-500" /> Ativas
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Instâncias com banco de dados e rotas provisionadas
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/60 bg-card/60 backdrop-blur-sm transition-all hover:border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Vínculos de Usuários
            </CardTitle>
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-bold tracking-tight text-foreground">{stats.totalUsers}</div>
              <Badge variant="secondary" className="bg-muted/60 text-[10px] font-normal">
                Global
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Total de permissões (memberships) registradas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Conteúdo Principal: Tabela de Recentes + Atalhos */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col justify-between border-border/60 bg-card/50 shadow-xs lg:col-span-2">
          <div>
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-4">
              <div className="space-y-0.5">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Clock className="h-4 w-4 text-primary" /> Instituições Recentes
                </CardTitle>
                <CardDescription className="text-xs">
                  Últimas 5 instâncias adicionadas ao ecossistema
                </CardDescription>
              </div>
              <Link
                href="/plataforma/instituicoes"
                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Ver todas <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </CardHeader>

            <CardContent className="p-0">
              {stats.recentInstitutions.length === 0 ? (
                <div className="m-6 rounded-lg border border-dashed border-border/60 p-8 text-center">
                  <Building2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-muted-foreground">
                    Nenhuma instituição cadastrada até o momento.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {stats.recentInstitutions.map((inst) => (
                    <Link
                      key={inst.id}
                      href={`/plataforma/instituicoes/${inst.id}`}
                      className="group flex items-center justify-between p-4 transition-colors hover:bg-muted/40"
                    >
                      {/* Removido o "ID: {inst.id}" cru que aparecia aqui —
                          um painel executivo não precisa expor UUID em
                          destaque numa lista; o ID continua disponível na
                          página de detalhe, para quem realmente precisar. */}
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none text-foreground transition-colors group-hover:text-primary">
                          {inst.name}
                        </p>
                        {(inst.city || inst.state) && (
                          <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {[inst.city, inst.state].filter(Boolean).join(" - ")}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className="gap-1.5 border-border/60 bg-background/50 text-[11px] font-normal"
                        >
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {new Date(inst.created_at).toLocaleDateString("pt-BR")}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </div>
        </Card>

        {/* Atalhos de Navegação Operacional */}
        <div className="flex flex-col gap-3.5">
          <Link href="/plataforma/instituicoes" className="group">
            <Card className="border-border/60 bg-card/60 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center gap-2.5 text-sm font-semibold">
                  <div className="rounded-md bg-primary/10 p-1.5 text-primary">
                    <Building2 className="h-4 w-4" />
                  </div>
                  Gestão de Instituições
                </CardTitle>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Acesse detalhes, altere parâmetros operacionais ou gerencie instâncias.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/plataforma/usuarios" className="group">
            <Card className="border-border/60 bg-card/60 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center gap-2.5 text-sm font-semibold">
                  <div className="rounded-md bg-primary/10 p-1.5 text-primary">
                    <Users className="h-4 w-4" />
                  </div>
                  Gestão de Usuários
                </CardTitle>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Consulte por e-mail, altere permissões de acesso e controle papéis globais.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/plataforma/logs" className="group">
            <Card className="border-border/60 bg-card/60 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center gap-2.5 text-sm font-semibold">
                  <div className="rounded-md bg-primary/10 p-1.5 text-primary">
                    <ScrollText className="h-4 w-4" />
                  </div>
                  Logs do Sistema
                </CardTitle>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Monitore trilhas de auditoria e conexões globais da infraestrutura.
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
