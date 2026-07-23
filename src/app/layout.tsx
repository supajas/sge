import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SGE — Sistema de Gestão Educacional",
  description:
    "Plataforma multi-tenant para gestão acadêmica: instituições, polos, cursos, turmas, disciplinas, alunos e notas.",
  keywords: ["gestão acadêmica", "EAD", "SGE", "sistema educacional"],
  openGraph: {
    title: "SGE — Sistema de Gestão Educacional",
    description:
      "Plataforma multi-tenant para gestão acadêmica: instituições, polos, cursos, turmas, disciplinas, alunos e notas.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SGE — Sistema de Gestão Educacional",
    description:
      "Plataforma multi-tenant para gestão acadêmica: instituições, polos, cursos, turmas, disciplinas, alunos e notas.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}`,
          }}
        />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
