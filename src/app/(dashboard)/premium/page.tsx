"use client";

import { useState } from "react";
import { 
  ArrowLeft, 
  Heart, 
  Sparkles, 
  Copy, 
  Check, 
  Server, 
  Cpu, 
  ShieldCheck, 
  QrCode, 
  Coffee,
  Code2
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PIX_PAYLOAD = "00020126510014BR.GOV.BCB.PIX0129alanjohnnydeandrade@gmail.com5204000053039865802BR5925ALAN JOHNNY DE ANDRADE SI6006RAPOSA622605227aSXkJeWLZSh49s8qpjmcJ63045E08";

const impactItems = [
  {
    icon: Server,
    title: "Infraestrutura & Servidores",
    description: "Ajuda a manter nossos bancos de dados e serviços cloud rodando 24/7 com alta velocidade.",
  },
  {
    icon: Cpu,
    title: "APIs & Recursos de IA",
    description: "Cobre os custos de processamento de inteligência artificial para geração automática de relatórios.",
  },
  {
    icon: Code2,
    title: "Desenvolvimento Contínuo",
    description: "Permite dedicar mais horas no desenvolvimento de novas funcionalidades e correções de bugs.",
  },
];

export default function ApoiePage() {
  const [copied, setCopied] = useState(false);

  const handleCopyPix = () => {
    navigator.clipboard.writeText(PIX_PAYLOAD);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background selection:bg-primary/20 selection:text-primary">
      {/* Glow de Fundo */}
      <div className="pointer-events-none absolute inset-0 flex justify-center overflow-hidden">
        <div className="h-[500px] w-[600px] -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border/40 bg-background/60 px-4 backdrop-blur-md sm:px-8">
        <div className="flex items-center gap-2">
          <span className="text-xl font-extrabold tracking-tight">SGE</span>
          <Badge variant="secondary" className="bg-rose-500/10 font-semibold text-rose-500 border-rose-500/20 gap-1">
            <Heart className="h-3 w-3 fill-rose-500" /> Apoie o Projeto
          </Badge>
        </div>
        <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Dashboard
          </Link>
        </Button>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-16 text-center sm:py-24">
          <div className="container relative z-10 mx-auto px-4">
            <Badge
              variant="outline"
              className="mb-6 inline-flex items-center gap-1.5 rounded-full border-primary/30 bg-primary/5 px-4 py-1.5 text-sm text-primary"
            >
              <Sparkles className="h-4 w-4" /> Mantendo a plataforma viva e independente
            </Badge>

            <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Gostou da ferramenta? <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-primary via-purple-500 to-rose-500 bg-clip-text text-transparent">
                Considere fazer uma doação
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg leading-relaxed">
              O SGE é desenvolvido de forma independente para modernizar a gestão educacional. Qualquer valor doado ajuda diretamente a custear a infraestrutura de servidores e o desenvolvimento de novas automações.
            </p>
          </div>
        </section>

        {/* Seção Principal Pix & QR Code */}
        <section className="pb-20">
          <div className="container mx-auto px-4">
            <Card className="mx-auto max-w-3xl overflow-hidden border-border/60 bg-card/60 backdrop-blur-md shadow-2xl shadow-primary/5">
              <CardHeader className="border-b border-border/40 bg-muted/30 p-6 text-center">
                <CardTitle className="text-xl font-semibold flex items-center justify-center gap-2">
                  <QrCode className="h-5 w-5 text-primary" /> Faça sua contribuição via Pix
                </CardTitle>
                <CardDescription className="text-xs">
                  Escaneie o código abaixo com o aplicativo do seu banco ou copie a chave do tipo Copia e Cola.
                </CardDescription>
              </CardHeader>

              <CardContent className="flex flex-col items-center gap-8 p-6 sm:p-10">
                {/* QR Code */}
                <div className="relative flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-white p-4 shadow-sm">
                  <Image
                    src="/pix-qrcode.jpeg" // Salve a imagem do QR code na pasta /public da sua aplicação com esse nome
                    alt="QR Code Pix"
                    width={220}
                    height={220}
                    className="rounded-lg"
                  />
                  <span className="mt-2 text-[11px] font-mono text-slate-500">Alan Johnny de Andrade</span>
                </div>

                {/* Copia e Cola */}
                <div className="w-full space-y-2">
                  <label className="text-xs font-medium text-muted-foreground block text-center">
                    Pix Copia e Cola:
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 p-2 pl-3">
                    <input
                      type="text"
                      readOnly
                      value={PIX_PAYLOAD}
                      className="w-full bg-transparent text-xs font-mono text-muted-foreground focus:outline-none truncate"
                    />
                    <Button
                      onClick={handleCopyPix}
                      size="sm"
                      className="shrink-0 gap-1.5 font-medium transition-all"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-400" /> Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" /> Copiar Código
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Como sua doação ajuda */}
        <section className="border-t border-border/40 bg-muted/20 py-20 backdrop-blur-sm">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center mb-12">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Para onde vai o valor investido?
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Toda contribuição é reinvestida integralmente para manter o projeto rápido, seguro e funcional.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-3 max-w-4xl mx-auto">
              {impactItems.map((item) => (
                <Card key={item.title} className="border-border/50 bg-background/50 backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base font-semibold">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/20 py-8 backdrop-blur-sm">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          <p className="flex items-center justify-center gap-1">
            Desenvolvido com <Coffee className="h-3.5 w-3.5 text-amber-500" /> por Alan Johnny. Muito obrigado pelo seu apoio!
          </p>
        </div>
      </footer>
    </div>
  );
}
