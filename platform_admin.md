# Plano Conceitual — Reorganização Owner/Admin, Permissões Editáveis e Platform Admin

> Documento de planejamento. Nenhum código foi implementado a partir daqui — é a base de decisão antes de qualquer migration ou arquivo novo.

---

## Parte 1 — Owner vs. Admin: diferenças críticas e reorganização de rotas

### 1.1 Estado atual

Owner e Admin hoje compartilham praticamente todas as permissões em `ROLE_PERMISSIONS` (`config/permissions.ts`). As diferenças entre os dois não são declaradas de forma centralizada — elas existem **espalhadas como checagens pontuais** em Server Actions e componentes:

| Diferença hoje | Onde vive |
|---|---|
| Só owner acessa a "Zona de Perigo" (excluir instituição) | `configuracoes/page.tsx`, checagem `isOwner` inline |
| Owner não pode ser removido por um admin | `colaboradores/actions.ts` → `removeMembershipAction`, `if (target.role === "owner") throw` |
| Owner não pode ter o papel alterado por um admin | `colaboradores/actions.ts` → `updateMembershipAction`, mesma checagem |
| Owner não pode ser deletado via RLS | policy `memberships_delete_admin`: `has_any_role_in(['owner','admin']) AND role <> 'owner'` |

O padrão é consistente, mas **duplicado** entre app e banco, e vai continuar crescendo de forma dispersa se não for formalizado agora — antes das novidades que você planeja adicionar.

### 1.2 Um gap de RLS que já dá pra corrigir com o que sabemos hoje

Reparei numa assimetria real nas policies que já vimos: a policy de **DELETE** em `memberships` tem o guard `role <> 'owner'`, mas a de **UPDATE** (`memberships_update_admin`) não tem o mesmo guard. Ou seja, a proteção contra "admin altera o papel do owner" existe hoje só na Server Action (`updateMembershipAction`) — não na RLS. Se alguém chamar `supabase.from("memberships").update(...)` direto do client (fora da Server Action), a RLS deixaria passar.

**Ajuste recomendado (mesma classe de correção que já fizemos com `course_polos`):**
```sql
CREATE OR REPLACE POLICY "memberships_update_admin"
ON public.memberships
FOR UPDATE
USING (
  has_any_role_in(institution_id, ARRAY['owner','admin']::app_role[])
  AND role <> 'owner'  -- 👈 faltava, existe só no DELETE hoje
)
WITH CHECK (
  has_any_role_in(institution_id, ARRAY['owner','admin']::app_role[])
  AND role <> 'owner'
);
```

### 1.3 Diferenças críticas propostas (formalizadas)

Proponho declarar essa lista como a fonte única de "o que só owner pode fazer", em vez de inline checks repetidos:

- Excluir a instituição.
- Alterar papel/remover o próprio owner (ninguém além do owner pode; nem o próprio admin).
- Editar a matriz de permissões (Parte 2 deste plano).
- *(Futuro, se vocês adicionarem)*: transferir a propriedade da instituição para outro membro; gerenciar cobrança/assinatura.

Tudo que **não** estiver nessa lista continua igual entre owner e admin — não estou propondo separar tudo, só o que é estruturalmente crítico.

### 1.4 Nova estrutura de rotas — grupo `(admin)`

Um route group **dentro** de `(dashboard)` (não altera nenhuma URL — parênteses são invisíveis pro Next.js):

```
src/app/(dashboard)/
├── layout.tsx                # já existe: TenantProvider, sidebar
├── (admin)/                  # NOVO — agrupador, zero mudança de URL
│   ├── layout.tsx            # faz a checagem isAdminLike() UMA vez
│   ├── colaboradores/        # move pra dentro — URL continua /colaboradores
│   ├── convites/
│   ├── configuracoes/
│   ├── templates-notas/
│   ├── permissoes/           # NOVO (Parte 2)
│   └── ... (novidades futuras admin-only)
├── alunos/                   # fora do grupo — não é admin-exclusivo
├── polos/
├── cursos/
└── ...
```

`(admin)/layout.tsx`, conceitualmente:
```tsx
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const tenant = useTenant();
  if (!tenant.active) return <SomeSkeleton />;
  if (!isAdminLike(tenant.active.role)) redirect("/sem-acesso");
  return <>{children}</>;
}
```

Cada página individual para de precisar checar `canAdmin` sozinha — herda a garantia do layout. Dentro dessas páginas, o que for **owner-only** (Zona de Perigo, futura edição de permissões) continua como um `if (isOwner)` local — não precisa de outro route group pra isso, seria over-engineering para uma seção dentro de uma página.

---

## Parte 2 — Permissões editáveis via UI (não editar `permissions.ts` direto)


### 2.1 O risco de segurança que isso expõe se for feito ingenuamente

Este é o ponto mais importante do plano inteiro, então vale destacar antes de qualquer estrutura de dados:

**Hoje, `permissions.ts` não tem nenhum efeito sobre a RLS.** Ele só controla o que aparece na sidebar e o que o componente `<Can>` esconde/mostra. A segurança real de dados é feita pelas policies de RLS, que checam `role` diretamente (`has_any_role_in`, `can_see_*`), **sem nunca consultar `Permission`**.

Se a página de edição só alterar uma tabela nova no banco, mas as RLS continuarem checando `role` cru, o owner vai *achar* que desabilitou "Professor pode editar notas", mas um professor ainda vai conseguir mandar um `UPDATE` direto pra tabela `grades` via client — porque a RLS nunca soube que essa permissão foi customizada. Isso seria pior que a situação atual: criaria uma **falsa sensação de controle**.

**Conclusão prática:** pra cada `Permission` que hoje corresponde a uma ação de escrita sensível (`manage:grades`, `manage:students`, `manage:courses`, etc.), a RLS da tabela correspondente precisa passar a consultar a mesma fonte de verdade da permissão — não só o papel isolado. Permissões puramente de navegação (`view:dashboard`, `view:periods`) não precisam disso, pois não protegem dados, só UI.

### 2.2 Nova estrutura de dados

```sql
CREATE TABLE public.institution_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  permission text NOT NULL,
  granted boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, role, permission)
);
```

- **Por que por instituição, não global:** é o owner/admin de uma instituição específica editando — logo a customização precisa ser escopada a ela. Instituição A pode restringir Professor mais que Instituição B.
- **Seed na criação da instituição:** `bootstrapInstitutionAction` passa a inserir uma linha por combinação `role × permission`, usando os valores atuais de `ROLE_PERMISSIONS` como default. O arquivo `permissions.ts` deixa de ser a fonte de verdade em runtime — passa a ser só o **seed inicial** e a lista de permissões válidas (tipo `Permission` continua útil em compile-time).

### 2.3 Função `has_permission()` e RLS da própria tabela

```sql
CREATE OR REPLACE FUNCTION public.has_permission(
  _institution_id uuid, _role app_role, _permission text
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT COALESCE(
    (SELECT granted FROM public.institution_role_permissions
     WHERE institution_id = _institution_id AND role = _role AND permission = _permission),
    false  -- fail-closed: se a linha não existe, nega por padrão
  );
$$;

-- Leitura: qualquer membro da instituição pode ler (sidebar, useCan)
CREATE POLICY "institution_role_permissions_select" ON public.institution_role_permissions
FOR SELECT USING (
  EXISTS (SELECT 1 FROM memberships m WHERE m.institution_id = institution_role_permissions.institution_id AND m.user_id = auth.uid())
);

-- Escrita: só owner (decisão da Parte 1 — ver 2.6 sobre o porquê)
CREATE POLICY "institution_role_permissions_write_owner" ON public.institution_role_permissions
FOR ALL USING (
  has_any_role_in(institution_id, ARRAY['owner']::app_role[])
) WITH CHECK (
  has_any_role_in(institution_id, ARRAY['owner']::app_role[])
);
```

### 2.4 Migrar as RLS existentes pra consultar `has_permission()`

Exemplo de conversão (`students_write_admin_coord`, que hoje é fixa por role):
```sql
-- Antes
USING (has_any_role_in(institution_id, ARRAY['owner','admin','coord_geral']::app_role[]))

-- Depois
USING (public.has_permission(institution_id, (
  SELECT role FROM memberships WHERE user_id = auth.uid() AND institution_id = students.institution_id
), 'manage:students'))
```

**Isso não precisa ser feito de uma vez.** Recomendo migrar table por table, começando pelas permissões que o owner realmente vai querer customizar primeiro (provavelmente `manage:grades` e `manage:students`, que são as mais "operacionais"). Permissões que nunca vão ser customizadas (ex: nada ligado a `owner`/`admin`, que sempre têm acesso total) não precisam de conversão — continuam com `has_any_role_in` fixo.

### 2.5 Página de edição (UI)

`(admin)/permissoes/page.tsx`: uma matriz — linhas = permissões, colunas = papéis (excluindo `owner`, ver 2.6). Cada célula é um switch/checkbox. Salvamento via Server Action `updatePermissionOverrideAction`, que:
1. Confirma que quem chama é owner (Parte 2.6).
2. Faz upsert na linha correspondente de `institution_role_permissions`.
3. Invalida o cache client (React Query) pra sidebar/`<Can>` refletirem na hora.

### 2.6 Salvaguardas (auto-bloqueio e escalonamento de privilégio)

- **`owner` nunca aparece como coluna editável.** Ele sempre tem acesso total, hardcoded, fora da tabela — evita o owner se autobloquear por engano.
- **Só owner edita, admin só visualiza.** Isso evita que um admin amplie o próprio teto de acesso (ex: se conceder `manage:collaborators` a si mesmo). É exatamente a diferença crítica que a Parte 1 pediu.
- **Proteção contra "ninguém sobra com acesso a X":** ao desmarcar uma permissão, validar server-side que pelo menos um papel (owner, que é implícito) continua com ela — na prática, como owner é sempre implícito, isso já é garantido automaticamente, mas vale um teste explícito na Server Action mesmo assim.

### 2.7 Processo operacional pra permissões novas no futuro

Sempre que uma feature nova adicionar uma `Permission` em `permissions.ts`, é preciso rodar uma migration de backfill inserindo a linha default pra **todas as instituições já existentes** (senão `has_permission()` nega por padrão pra quem já existia antes da feature). Vale documentar isso como checklist — é o tipo de detalhe operacional que, se esquecido, gera bug silencioso (ninguém vê erro, só a funcionalidade nova "não aparece" pra ninguém).

---

## Parte 3 — Platform Admin (plano completo)

### 3.1 Modelo de dados

```sql
CREATE TABLE public.platform_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = _user_id);
$$;
```
Independente de `memberships` — uma pessoa pode ser owner de uma instituição **e** platform admin ao mesmo tempo, sem conflito.

### 3.2 Estrutura de rotas — correção importante da proposta anterior

**Aqui, ao contrário da Parte 1, o grupo NÃO deve usar parênteses.** Queremos uma URL própria e visível (`/plataforma/...`), então é uma pasta normal, irmã de `(dashboard)`, `onboarding`, `invite`:

```
src/app/
├── (dashboard)/          # escopo de UMA instituição (já existe)
├── plataforma/           # NOVO — pasta real, URL visível /plataforma
│   ├── layout.tsx        # guarda via is_platform_admin(), SEM TenantProvider
│   ├── page.tsx          # /plataforma — visão geral
│   ├── instituicoes/
│   │   ├── page.tsx      # /plataforma/instituicoes
│   │   └── [id]/page.tsx # /plataforma/instituicoes/[id] — drill-down
│   ├── usuarios/
│   │   └── page.tsx
│   ├── logs/
│   │   └── page.tsx
│   └── relatorios/
│       └── page.tsx
├── onboarding/
├── invite/
└── ...
```

### 3.3 Padrão de acesso a dados

Server Actions com `service_role`, gate por `is_platform_admin()` **antes** de qualquer query — sem tocar nas RLS institucionais já existentes e testadas:
```ts
export async function listAllInstitutionsAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");
  if (!isPlatformAdmin) throw new Error("Acesso restrito.");

  const admin = getAdminClient(); // service_role
  return admin.from("institutions").select("*");
}
```

### 3.4 Auditoria (crítico, dado o nível de acesso)

Tabela separada da `approval_history` institucional (que é escopada por `institution_id` e não cabe bem "ações que cruzam instituições"):
```sql
CREATE TABLE public.platform_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  target_institution_id uuid REFERENCES institutions(id),
  target_user_id uuid REFERENCES auth.users(id),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
```
Toda Server Action de `/plataforma` que fizer uma leitura sensível (ex: abrir dados de uma instituição) ou qualquer escrita deveria gravar aqui. Se algum dia vocês adicionarem "visualizar como" (impersonar um usuário pra suporte), isso é **obrigatório**, não opcional — é o tipo de recurso que sem auditoria rigorosa se torna um risco de confiança sério.

### 3.5 Ponto de entrada no login

O `auth/callback/route.ts` (já pendente de outra conversa) precisa de um branch adicional:
```
1. is_platform_admin()? → redireciona para /plataforma
2. senão → fluxo atual (/onboarding)
```

### 3.6 Páginas propostas (visão inicial, priorizável)

| Página | Prioridade | Conteúdo |
|---|---|---|
| `/plataforma` | Alta | Nº instituições, nº usuários totais, instituições recém-criadas |
| `/plataforma/instituicoes` | Alta | Lista + busca; clique leva ao drill-down |
| `/plataforma/instituicoes/[id]` | Média | Dados da instituição, membros, capacidade de suspender/reativar |
| `/plataforma/usuarios` | Média | Busca de usuário por e-mail entre todas as instituições |
| `/plataforma/logs` | Média | Leitura do `platform_audit_log` |
| `/plataforma/relatorios` | Baixa | Fica pra quando houver métricas de produto mais maduras |

---

## Roadmap sugerido (ordem de implementação)

1. **Parte 1.2** — fix da RLS de `memberships_update_admin` (é uma correção isolada, baixo risco, vale fazer já independente do resto).
2. **Parte 1.4** — mover páginas pro grupo `(admin)` (mecânico, baixo risco, sem mudança de URL).
3. **Parte 2** — permissões editáveis (a mais trabalhosa: tabela nova, seed, função, página, e migração gradual das RLS mais importantes).
4. **Parte 3** — Platform Admin (independente das outras duas, pode ser feito em paralelo por outra pessoa/momento, já que não compartilha código com o resto).

Este documento é só o plano — nenhuma migration, Server Action ou componente foi criado. Quando você quiser começar a implementação de qualquer uma das partes, retomamos com o código real.
