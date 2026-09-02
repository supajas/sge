"use client";

import { useState } from "react";
import {
  CircleHelp,
  Search,
  BookOpen,
  Users,
  GraduationCap,
  Layers,
  FileSpreadsheet,
  Building2,
  Calendar,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  UserCheck,
  Mail,
  Sliders,
  HelpCircle,
  ChevronRight,
  Info,
} from "lucide-react";
import { PageBody, PageHeader } from "@/components/page";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useTenant } from "@/lib/tenant";
import { ROLE_LABELS } from "@/lib/roles";

export default function AjudaPage() {
  const { active } = useTenant();
  const [searchTerm, setSearchTerm] = useState("");

  const searchLower = searchTerm.toLowerCase().trim();

  // Função para verificar se a palavra busca bate com o termo
  const matchesSearch = (...texts: (string | undefined)[]) => {
    if (!searchLower) return true;
    return texts.some((t) => t && t.toLowerCase().includes(searchLower));
  };

  return (
    <>
      <PageHeader
        title={
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
              <CircleHelp className="h-4.5 w-4.5" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">
              Central de Ajuda & Guia do Sistema
            </h1>
          </div>
        }
        description="Explore manuais práticos, entenda as permissões de acesso e confira boas práticas para a rotina no SGE."
      />

      <PageBody>
        {/* Barra de Busca Interativa */}
        <div className="relative mb-6">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="O que você deseja aprender hoje? (ex: notas, convites, evadido, polos, turmas)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 text-sm bg-card/80 border-border/60 shadow-xs focus-visible:ring-primary"
          />
        </div>

        {/* 1. Visão Geral do SGE */}
        {matchesSearch("visão geral", "o que é", "propósito", "sge", "plataforma", "sistema") && (
          <Card className="mb-6 border-border/60 bg-gradient-to-r from-primary/5 via-card to-card shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">
                  <Sparkles className="mr-1 h-3 w-3" /> Apresentação
                </Badge>
              </div>
              <CardTitle className="text-base font-semibold mt-1">
                O que é o SGE e qual seu propósito?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs leading-relaxed text-muted-foreground">
              <p>
                O <strong className="text-foreground font-semibold">SGE (Sistema de Gestão Escolar)</strong> é uma plataforma acadêmica integrada desenvolvida para simplificar a rotina pedagógica e administrativa de instituições de ensino presencial e a distância (EAD).
              </p>
              <div className="grid gap-3 sm:grid-cols-3 pt-1">
                <div className="rounded-lg border border-border/40 bg-background/50 p-3">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground mb-1">
                    <Building2 className="h-4 w-4 text-primary" /> Multi-Polo & EAD
                  </div>
                  Organização descentralizada de unidades, polos de apoio e cursos com gestão de acesso por escopo regional.
                </div>
                <div className="rounded-lg border border-border/40 bg-background/50 p-3">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground mb-1">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-400" /> Central de Notas
                  </div>
                  Lançamento de notas intuitivo com salvamento automático em tempo real e relatórios operacionais sem complicação.
                </div>
                <div className="rounded-lg border border-border/40 bg-background/50 p-3">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground mb-1">
                    <GraduationCap className="h-4 w-4 text-amber-400" /> Retenção de Discentes
                  </div>
                  Indicadores em tempo real de alunos ativos, acompanhamento de evasão/trancamento e saúde do período letivo.
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs de Seções Principais */}
        <Tabs defaultValue="guias" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-muted/60 p-1">
            <TabsTrigger value="guias" className="text-xs font-medium">
              <BookOpen className="mr-1.5 h-3.5 w-3.5" /> Guias Passo a Passo
            </TabsTrigger>
            <TabsTrigger value="perfis" className="text-xs font-medium">
              <Users className="mr-1.5 h-3.5 w-3.5" /> Perfis & Permissões
            </TabsTrigger>
            <TabsTrigger value="cautelas" className="text-xs font-medium">
              <ShieldAlert className="mr-1.5 h-3.5 w-3.5" /> Boas Práticas & Alertas
            </TabsTrigger>
          </TabsList>

          {/* =================================================================== */}
          {/* TAB 1: GUIAS PASSO A PASSO */}
          {/* =================================================================== */}
          <TabsContent value="guias" className="space-y-4">
            <Accordion type="single" collapsible defaultValue="item-notas" className="w-full space-y-3">
              
              {/* GUIA 1: CENTRAL DE NOTAS */}
              {matchesSearch("notas", "lançamento", "avaliação", "regular", "reposição", "final", "repercurso", "health check") && (
                <AccordionItem value="item-notas" className="border border-border/60 rounded-xl bg-card px-4">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3 text-left">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                        <FileSpreadsheet className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground">Central de Notas & Digitação</div>
                        <div className="text-xs text-muted-foreground font-normal">Como lançar notas, entender o salvamento automático e acompanhar pendências</div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4 space-y-4 text-xs text-muted-foreground border-t border-border/40">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                        <ChevronRight className="h-3.5 w-3.5 text-primary" /> Passo a Passo para Digitação de Notas:
                      </h4>
                      <ol className="list-decimal pl-5 space-y-1.5">
                        <li>Acesse o menu <strong className="text-foreground">Central de Notas</strong> na barra lateral.</li>
                        <li>Selecione o <strong className="text-foreground">Curso</strong> desejado.</li>
                        <li>Selecione a <strong className="text-foreground">Turma</strong> e o <strong className="text-foreground">Período Letivo</strong>.</li>
                        <li>Escolha a <strong className="text-foreground">Disciplina</strong> para abrir a grade de alunos da turma.</li>
                        <li>Digite a nota diretamente no campo do aluno (aceita vírgula ou ponto, ex: 7,5 ou 8.0).</li>
                      </ol>
                    </div>

                    <div className="rounded-lg bg-muted/40 p-3 space-y-2">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/5">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Salvamento Automático
                        </Badge>
                      </div>
                      <p>
                        As notas são salvas <strong className="text-foreground font-medium">automaticamente em tempo real</strong> assim que você clica fora do campo ou pressiona Enter. Não é necessário clicar em nenhum botão de salvar individual!
                      </p>
                    </div>

                    <div className="space-y-2 pt-1">
                      <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                        <HelpCircle className="h-3.5 w-3.5 text-primary" /> Entendendo os Tipos de Avaliação:
                      </h4>
                      <ul className="space-y-1.5 pl-2">
                        <li className="flex items-start gap-2">
                          <Badge variant="outline" className="mt-0.5 shrink-0 text-[10px]">Avaliação Regular</Badge>
                          <span>Nota principal obtida pelo aluno durante o decorrer da disciplina.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Badge variant="outline" className="mt-0.5 shrink-0 text-[10px]">Reposição</Badge>
                          <span>Avaliação destinada aos discentes que faltaram ou necessitam repor a nota regular.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Badge variant="outline" className="mt-0.5 shrink-0 text-[10px]">Avaliação Final</Badge>
                          <span>Exame final aplicado aos alunos que não atingiram a média mínima direta.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Badge variant="outline" className="mt-0.5 shrink-0 text-[10px]">Repercurso</Badge>
                          <span>Oportunidade especial de recuperação de aprendizagem no encerramento.</span>
                        </li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* GUIA 2: PESSOAS E CONVITES */}
              {matchesSearch("pessoas", "alunos", "convites", "colaboradores", "matrícula", "status", "evadido", "trancado") && (
                <AccordionItem value="item-pessoas" className="border border-border/60 rounded-xl bg-card px-4">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3 text-left">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground">Gestão de Pessoas & Convites</div>
                        <div className="text-xs text-muted-foreground font-normal">Como matricular alunos, alterar status e convidar novos colaboradores</div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4 space-y-4 text-xs text-muted-foreground border-t border-border/40">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                        <GraduationCap className="h-3.5 w-3.5 text-primary" /> Matrícula e Gestão de Alunos:
                      </h4>
                      <ol className="list-decimal pl-5 space-y-1.5">
                        <li>Acesse a página <strong className="text-foreground">Alunos</strong> no menu.</li>
                        <li>Filtre o Curso, Polo e Turma desejados.</li>
                        <li>Clique em <strong className="text-foreground">Novo Aluno</strong> para cadastrar individualmente ou em <strong className="text-foreground">Importar CSV</strong> para cadastrar em lote.</li>
                        <li>Para alterar o status do aluno, clique no botão de status da linha correspondente (ex: de <em>Ativo</em> para <em>Trancado</em> ou <em>Evadido</em>).</li>
                      </ol>
                    </div>

                    <div className="space-y-2 pt-1 border-t border-border/30">
                      <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-primary" /> Convite de Colaboradores (Professores e Coordenadores):
                      </h4>
                      <ol className="list-decimal pl-5 space-y-1.5">
                        <li>Acesse o menu <strong className="text-foreground">Convites</strong> (exclusivo para perfil Administrador/Owner).</li>
                        <li>Clique em <strong className="text-foreground">Gerar Convite</strong>.</li>
                        <li>Selecione o papel do colaborador (ex: <em>Coord. Polo</em>, <em>Professor</em>).</li>
                        <li><strong className="text-foreground font-semibold">Importante:</strong> Marque os Polos e Cursos que o colaborador terá acesso para visualizar as turmas correspondentes.</li>
                        <li>Compartilhe o código ou link de convite gerado com o novo usuário.</li>
                      </ol>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* GUIA 3: ESTRUTURA ACADÊMICA */}
              {matchesSearch("estrutura", "polos", "cursos", "turmas", "disciplinas", "períodos") && (
                <AccordionItem value="item-estrutura" className="border border-border/60 rounded-xl bg-card px-4">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3 text-left">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground">Estrutura Acadêmica</div>
                        <div className="text-xs text-muted-foreground font-normal">Como cadastrar Polos, Cursos, Turmas, Disciplinas e Períodos Letivos</div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4 space-y-4 text-xs text-muted-foreground border-t border-border/40">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-border/40 p-3 space-y-1.5">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-primary" /> Polos & Cursos
                        </div>
                        <p>
                          Cadastre os polos de apoio presenciais ou unidades e vincule os cursos ofertados em cada polo na tela de Cursos.
                        </p>
                      </div>

                      <div className="rounded-lg border border-border/40 p-3 space-y-1.5">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-primary" /> Turmas & Disciplinas
                        </div>
                        <p>
                          Crie turmas associando-as a um Curso e Polo específico. Em Disciplinas, cadastre a matriz curricular e associe cada disciplina ao seu Período Letivo correspondente.
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 space-y-1">
                      <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" /> Configuração de Períodos Letivos (ex: 2026.1)
                      </div>
                      <p className="text-muted-foreground">
                        Em <strong className="text-foreground">Períodos Letivos</strong>, marque a opção <strong className="text-foreground">Vigente/Ativo</strong> no semestre atual. Isso ativará o monitoramento automático do Health Check Operacional no Dashboard.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

            </Accordion>
          </TabsContent>

          {/* =================================================================== */}
          {/* TAB 2: PERFIS E PERMISSÕES */}
          {/* =================================================================== */}
          <TabsContent value="perfis" className="space-y-4">
            <Card className="border-border/60 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  O que cada perfil de acesso pode realizar no SGE?
                </CardTitle>
                <CardDescription className="text-xs">
                  Entenda os papéis e garantias de segurança de dados por nível hierárquico.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="divide-y divide-border/40">
                  
                  <div className="py-3 first:pt-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary/20 text-primary border-primary/30">Owner / Admin</Badge>
                      <span className="font-semibold text-foreground">Gestão Institucional Total</span>
                    </div>
                    <p className="text-muted-foreground pl-1">
                      Possui controle completo da instituição. Cadastra e edita cursos, polos, turmas, disciplinas, períodos letivos, gera convites de colaboradores e configura templates de notas.
                    </p>
                  </div>

                  <div className="py-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/5">Coord. Geral & Secretaria</Badge>
                      <span className="font-semibold text-foreground">Gestão Operacional de Ensino</span>
                    </div>
                    <p className="text-muted-foreground pl-1">
                      Acompanha o panorama acadêmico geral, gerencia matrículas de discentes, atualiza status (ativos, trancados, evadidos) e supervisiona a digitação de notas em todas as unidades.
                    </p>
                  </div>

                  <div className="py-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/5">Coord. de Polo / Curso</Badge>
                      <span className="font-semibold text-foreground">Acompanhamento Regional</span>
                    </div>
                    <p className="text-muted-foreground pl-1">
                      Acessa exclusivamente os dados dos polos ou cursos que lhe foram atribuídos. Acompanha a taxa de retenção da sua unidade, turmas alocadas e digitação de notas das suas turmas.
                    </p>
                  </div>

                  <div className="py-3 last:pb-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/5">Professor & Tutor</Badge>
                      <span className="font-semibold text-foreground">Lançamento de Notas na Sala</span>
                    </div>
                    <p className="text-muted-foreground pl-1">
                      Acessa a Central de Notas para digitar e revisar as avaliações das disciplinas e turmas das quais leciona, contando com salvamento automático.
                    </p>
                  </div>

                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* =================================================================== */}
          {/* TAB 3: BOAS PRÁTICAS E ALERTAS DE RISCO */}
          {/* =================================================================== */}
          <TabsContent value="cautelas" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              
              {/* CARD 1: EVASÃO E TRANCAMENTO */}
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="destructive" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                      <AlertTriangle className="mr-1 h-3 w-3" /> Cautela Operacional
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-semibold text-foreground mt-2">
                    Evasão, Trancamento e Status de Alunos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p>
                    <strong className="text-foreground">O que acontece ao alterar o status de um aluno?</strong>
                  </p>
                  <p>
                    Ao mudar um aluno de <strong className="text-emerald-400">Ativo</strong> para <strong className="text-amber-400">Evadido</strong>, <strong className="text-amber-400">Trancado</strong> ou <strong className="text-amber-400">Transferido</strong>, ele é imediatamente desconsiderado do cálculo de notas esperadas no Dashboard (Health Check Operacional e Taxa de Retenção).
                  </p>
                  <div className="rounded border border-amber-500/30 bg-background/60 p-2 font-medium text-foreground">
                    ⚠️ Atenção: Altere o status apenas quando houver confirmação oficial da secretaria para não ocultar pendências pedagógicas reais.
                  </div>
                </CardContent>
              </Card>

              {/* CARD 2: PERÍODOS LETIVOS */}
              <Card className="border-border/60 bg-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">
                      <Sparkles className="mr-1 h-3 w-3" /> Dica de Ouro
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-semibold text-foreground mt-2">
                    Vigência de Períodos Letivos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p>
                    <strong className="text-foreground">Mantenha apenas o Período Vigente Ativo:</strong>
                  </p>
                  <p>
                    O indicador do Dashboard monitora as disciplinas vinculadas ao período letivo marcado como <strong className="text-foreground">Ativo (is_active = true)</strong>.
                  </p>
                  <div className="rounded border border-border/40 bg-muted/40 p-2 font-medium text-foreground">
                    💡 Dica: Ao iniciar um novo semestre (ex: 2026.2), ative o novo período e desative o período anterior para manter os alertas 100% calibrados.
                  </div>
                </CardContent>
              </Card>

              {/* CARD 3: TEMPLATES DE NOTAS */}
              <Card className="border-destructive/30 bg-destructive/5">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="destructive">
                      <ShieldAlert className="mr-1 h-3 w-3" /> Risco de Perda de Dados
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-semibold text-foreground mt-2">
                    Edição de Templates de Notas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p>
                    <strong className="text-foreground">Não exclua campos com notas já digitadas:</strong>
                  </p>
                  <p>
                    Se os professores já começaram a lançar notas em um campo (ex: *Avaliação Regular*), excluir esse campo no Template de Notas deixará os registros de notas órfãos no banco de dados.
                  </p>
                  <div className="rounded border border-destructive/30 bg-background/60 p-2 font-medium text-foreground">
                    ⛔ O que NÃO fazer: Nunca exclua colunas de avaliação no decorrer do período letivo ativo.
                  </div>
                </CardContent>
              </Card>

              {/* CARD 4: GESTÃO DE CONVITES */}
              <Card className="border-border/60 bg-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/5">
                      <UserCheck className="mr-1 h-3 w-3" /> Boas Práticas
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-semibold text-foreground mt-2">
                    Vínculo de Escopo em Convites
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p>
                    <strong className="text-foreground">Atribuição correta de Polos e Cursos:</strong>
                  </p>
                  <p>
                    Ao convidar um <em>Coordenador de Polo</em> ou <em>Tutor Presencial</em>, lembre-se de marcar os polos correspondentes. Sem essa seleção, o usuário receberá a mensagem de *Sem Acesso* por falta de permissão de escopo.
                  </p>
                  <div className="rounded border border-border/40 bg-muted/40 p-2 font-medium text-foreground">
                    ✓ Prática recomendada: Confira a lista de polos associados no momento da criação do convite.
                  </div>
                </CardContent>
              </Card>

            </div>
          </TabsContent>
        </Tabs>
      </PageBody>
    </>
  );
}
