import { ScrollText, Building2, Search, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPlatformAuditLogAction } from "../actions";

// Rótulos amigáveis por tipo de ação registrada. Adicione uma entrada aqui
// sempre que uma nova Server Action de /plataforma passar a gravar no
// platform_audit_log (ver padrão em actions.ts).
const ACTION_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  view_institution_detail: { label: "visualizou os detalhes da instituição", icon: Eye },
  search_users: { label: "buscou usuários por e-mail", icon: Search },
};

export default async function LogsPage() {
  const logs = await getPlatformAuditLogAction(50);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6 md:p-8">
      <div className="border-b border-border/60 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Logs de Auditoria</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Registro de ações sensíveis realizadas por administradores da plataforma — leituras que expõem dado de
          outras instituições, e futuras escritas. Não é um log de infraestrutura (erros, deploys, tentativas de
          login) — para isso, use o painel da Vercel ou do Supabase.
        </p>
      </div>

      <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <ScrollText className="h-4 w-4 text-primary" /> Últimos eventos
          </CardTitle>
          <CardDescription className="text-xs">
            {logs.length} {logs.length === 1 ? "registro mais recente" : "registros mais recentes"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="p-8 text-center">
              <ScrollText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">Nenhum evento registrado ainda.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {logs.map((log) => {
                const meta = ACTION_LABELS[log.action] ?? { label: log.action, icon: Eye };
                const Icon = meta.icon;
                return (
                  <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-foreground">
                        <span className="font-medium">{log.actorEmail}</span> {meta.label}
                        {log.targetInstitutionName && (
                          <Badge
                            variant="secondary"
                            className="ml-2 gap-1 bg-muted/60 align-middle text-[11px] font-normal"
                          >
                            <Building2 className="h-3 w-3" /> {log.targetInstitutionName}
                          </Badge>
                        )}
                      </div>
                      {log.metadata && (
                        <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                          {JSON.stringify(log.metadata)}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString("pt-BR")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
