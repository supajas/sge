import Link from "next/link";
import {
  Building2,
  Users,
  ScrollText,
  Plus,
  ArrowUpRight,
  Clock,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPlatformOverviewAction } from "./actions";

export default async function PlataformaPage() {
  const stats = await getPlatformOverviewAction();

  return (
    <div className="platform-theme min-h-screen bg-background text-foreground flex flex-col gap-8 p-6 md:p-8">
      {/* Cabeçalho de Alto Nível */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Visão Geral da Plataforma
            </h1>
            <Badge variant="secondary" className="gap-1 font-mono text-xs">
              <ShieldCheck className="h-3 w-3 text-primary" /> Admin
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Painel executivo para governança global de instâncias, usuários e auditoria.
          </p>
        </div>

        <Button asChild size="sm" className="gap-2 shadow-sm self-start sm:self-auto">
          <Link href="/plataforma/instituicoes/nova">
            <Plus className="h-4 w-4" /> Nova Instituição
          </Link>
        </Button>
      </div>

      {/* Grid de Métricas Globais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        <Card className="relative overflow-hidden border-border/60 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Instituições
            </CardTitle>
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{stats.totalInstitutions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Instâncias ativas e configuradas no banco
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/60 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vínculos de Usuários
            </CardTitle>
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total de matrículas (memberships) atribuídas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Seção Principal: Tabela de Recentes + Cards de Navegação */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lista de Instituições Recentes */}
        <Card className="lg:col-span-2 border-border/60 flex flex-col justify-between">
          <div>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" /> Instituições Recentes
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Últimas 5 instâncias adicionadas ao ecossistema
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-xs gap-1" asChild>
                <Link href="/plataforma/instituicoes">
                  Ver todas <ChevronRight className="h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>

            <CardContent>
              {stats.recentInstitutions.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    Nenhuma instituição cadastrada até o momento.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {stats.recentInstitutions.map((inst) => (
                    <div
                      key={inst.id}
                      className="flex items-center justify-between py-3 hover:bg-muted/40 px-2 rounded-md transition-colors"
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium leading-none text-foreground">
                          {inst.name}
                        </p>
                        <p className="text-[11px] font-mono text-muted-foreground">
                          ID: {inst.id}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[11px] font-normal">
                        {new Date(inst.created_at).toLocaleDateString("pt-BR")}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </div>
        </Card>

        {/* Atalhos Executivos de Navegação */}
        <div className="flex flex-col gap-4">
          <Link href="/plataforma/instituicoes" className="group">
            <Card className="transition-all hover:border-primary/50 hover:shadow-md bg-card/60">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" /> Gestão de Instituições
                </CardTitle>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Acesse detalhes, altere parâmetros operacionais ou gerencie status das instâncias.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/plataforma/usuarios" className="group">
            <Card className="transition-all hover:border-primary/50 hover:shadow-md bg-card/60">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" /> Gestão de Usuários
                </CardTitle>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Consulte por e-mail, altere permissões de acesso e controle papéis de administradores.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/plataforma/logs" className="group">
            <Card className="transition-all hover:border-primary/50 hover:shadow-md bg-card/60">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ScrollText className="h-4 w-4 text-primary" /> Logs do Sistema
                </CardTitle>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Monitore trilhas de auditoria, conexões e eventos globais da infraestrutura.
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
