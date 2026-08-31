import Link from "next/link";
import { Building2, Users, ChevronRight, Calendar, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { listInstitutionsAction } from "../actions";
import { SearchInstitutions } from "./components/search-institutions";

interface InstituicoesListPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function InstituicoesListPage({ searchParams }: InstituicoesListPageProps) {
  const { q } = await searchParams;
  const institutions = await listInstitutionsAction(q);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6 md:p-8">
      {/* Cabeçalho — removido o botão "Nova Instituição" que levava para
          /plataforma/instituicoes/nova, uma rota que ainda não existe
          (404 garantido). Volta quando essa página for construída. */}
      <div className="flex flex-col gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Gestão de Instituições
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {institutions.length} {institutions.length === 1 ? "instituição encontrada" : "instituições encontradas"}
            {q && ` para "${q}"`}
          </p>
        </div>
        <SearchInstitutions defaultValue={q ?? ""} />
      </div>

      {/* Grid de Cards de Instituição — cada card é o próprio link (padrão
          comum em painéis de admin: o card inteiro é clicável, sem precisar
          de um botão "Detalhes" repetindo a mesma ação). */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {institutions.length === 0 ? (
          <Card className="col-span-full border-dashed border-border/60 bg-card/40 p-12 text-center">
            <CardContent className="flex flex-col items-center justify-center p-0">
              <div className="mb-3 rounded-full bg-muted/60 p-3 text-muted-foreground">
                <Building2 className="h-8 w-8" />
              </div>
              <p className="text-base font-medium text-foreground">
                {q ? "Nenhuma instituição encontrada" : "Nenhuma instituição cadastrada"}
              </p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                {q
                  ? `Nenhum resultado para "${q}". Tente outro termo de busca.`
                  : "Não há instâncias registradas na plataforma até o momento."}
              </p>
            </CardContent>
          </Card>
        ) : (
          institutions.map((inst) => (
            <Link key={inst.id} href={`/plataforma/instituicoes/${inst.id}`} className="group">
              <Card className="flex h-full flex-col justify-between border-t-2 border-border/60 border-t-primary/20 bg-card/60 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:border-t-primary hover:shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="line-clamp-1 text-base font-semibold text-foreground transition-colors group-hover:text-primary">
                    {inst.name}
                  </CardTitle>
                  <CardDescription className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground/70" />
                    {inst.city && inst.state ? `${inst.city} - ${inst.state}` : "Localização não informada"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  <div className="flex items-center justify-between border-t border-border/40 pt-3 text-xs text-muted-foreground">
                    {/* Antes: inst.memberships?.[0]?.count — campo que não
                        existe no retorno da action (que já devolve
                        memberCount como número pronto). Sempre mostrava 0. */}
                    <span className="flex items-center gap-1.5 font-medium text-foreground/80">
                      <Users className="h-3.5 w-3.5 text-primary" />
                      {inst.memberCount} {inst.memberCount === 1 ? "membro" : "membros"}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground/80">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(inst.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Ver detalhes <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
