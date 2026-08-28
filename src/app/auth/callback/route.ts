import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<Awaited<ReturnType<typeof cookies>>["set"]>[2];
};

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");

  if (code) {
    const cookieStore = await cookies();

    // 1. Instancia a resposta inicial para manipular os cookies durante o fluxo
    let targetPath = nextParam ?? "/onboarding";

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: CookieToSet[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // 2. Troca o código temporário por uma sessão válida
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // 3. Se não veio um 'next' explícito via URL, verifica se é Platform Admin
      if (!nextParam) {
        const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");

        if (isPlatformAdmin) {
          targetPath = "/plataforma";
        }
      }

      // 4. Cria a resposta final com o cookie da sessão gravado
      const response = NextResponse.redirect(`${origin}${targetPath}`);

      // Garante a sincronização dos cookies gravados na resposta HTTP
      const allCookies = cookieStore.getAll();
      allCookies.forEach((c) => {
        response.cookies.set(c.name, c.value);
      });

      return response;
    }
  }

  return NextResponse.redirect(`${origin}/?error=Could%20not%20authenticate%20user`);
}
