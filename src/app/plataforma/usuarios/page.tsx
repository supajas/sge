import { Users, ShieldCheck, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { searchUsersAction } from "../actions";
import { SearchUsers } from "./components/search-users";

interface UsuariosPageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function UsuariosPage({ searchParams }: UsuariosPageProps) {
  const { email } = await searchParams;
  const trimmed = email?.trim() ?? "";
  const results = trimmed.length >= 3 ? await searchUsersAction(trimmed) : [];

  const showEmptyPrompt = trimmed.length === 0;
  const showTooShort = trimmed.length > 0 && trimmed.length < 3;
  const showNoResults = trimmed.length >= 3 && results.length === 0;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6 md:p-8">
      <div className="flex flex-col gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Gestão de Usuários</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Busque por e-mail para ver os vínculos institucionais de qualquer usuário da plataforma.
          </p>
        </div>
        <SearchUsers defaultValue={email ?? ""} />
      </div>

      {showEmptyPrompt && (
        <Card className="border-dashed border-border/60 bg-card/40">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 rounded-full bg-muted/60 p-3 text-muted-foreground">
              <Users className="h-8 w-8" />
            </div>
            <p className="text-sm font-medium text-foreground">Nenhuma busca realizada ainda</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Digite ao menos 3 caracteres de um e-mail para começar — não é possível listar todos os usuários de uma vez.
            </p>
          </CardContent>
        </Card>
      )}

      {showTooShort && (
        <Card className="border-dashed border-border/60 bg-card/40">
          <CardContent className="py-8 text-center text-xs text-muted-foreground">
            Digite ao menos 3 caracteres para buscar.
          </CardContent>
        </Card>
      )}

      {showNoResults && (
        <Card className="border-dashed border-border/60 bg-card/40">
          <CardContent className="py-8 text-center text-xs text-muted-foreground">
            Nenhum usuário encontrado para &quot;{trimmed}&quot;.
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((user) => (
            <Card key={user.id} className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border border-border/60">
                      <AvatarFallback className="text-xs font-semibold">
                        {user.email?.[0]?.toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Cadastrado em {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  {user.isPlatformAdmin && (
                    <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/10 text-xs text-primary">
                      <ShieldCheck className="h-3 w-3" /> Platform Admin
                    </Badge>
                  )}
                </div>

                <div className="mt-3 border-t border-border/40 pt-3">
                  {user.memberships.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sem vínculo institucional.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {user.memberships.map((m, i) => (
                        <Badge
                          key={`${m.institutionId}-${i}`}
                          variant="secondary"
                          className="gap-1.5 bg-muted/60 text-[11px] font-normal"
                        >
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          {m.institutionName}
                          <span className="text-muted-foreground/70">·</span>
                          <span className="capitalize">{m.role}</span>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
