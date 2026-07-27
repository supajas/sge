"use client";

import { ArrowLeft, Building, BarChart3, Bot, Sparkles, Rocket, Check, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: Building,
    title: "Multi-Instituição",
    description: "Gerencie múltiplas unidades, filiais ou campi a partir de uma única conta, com total separação de dados e permissões.",
  },
  {
    icon: BarChart3,
    title: "Relatórios Avançados",
    description: "Acesse dashboards interativos com insights sobre matrículas, desempenho acadêmico e indicadores de evasão.",
  },
  {
    icon: Bot,
    title: "Automação com IA",
    description: "Otimize rotinas repetitivas, geração de relatórios e a alocação inteligente de professores com inteligência artificial.",
  },
  {
    icon: Sparkles,
    title: "Atendimento Prioritário",
    description: "Acesso direto a um gerente de contas dedicado e suporte técnico VIP via chat prioritário e telefone.",
  },
];

const pricingTiers = [
  {
    name: "Pro",
    price: "R$ 299",
    period: "/mês",
    description: "Para instituições em crescimento que buscam mais poder e automação no dia a dia.",
    features: [
      "Até 5 instituições ou campi",
      "Dashboards e Relatórios Avançados",
      "Suporte VIP via Email e Chat",
      "Exportação ilimitada de dados",
    ],
    cta: "Começar com Pro",
    featured: false,
  },
  {
    name: "Enterprise",
    price: "Customizado",
    period: "",
    description: "Soluções sob medida para grandes redes de ensino com alta demanda e integrações personalizadas.",
    features: [
      "Instituições e campi ilimitados",
      "Automação avançada com IA",
      "Suporte Prioritário 24/7",
      "Gerente de conta dedicado",
      "Treinamento para equipes",
    ],
    cta: "Fale com um especialista",
    featured: true,
  },
];

export default function PremiumPage() {
  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background selection:bg-primary/20 selection:text-primary">
      {/* Background Subtle Glows */}
      <div className="pointer-events-none absolute inset-0 flex justify-center overflow-hidden">
        <div className="h-[500px] w-[600px] -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border/40 bg-background/60 px-4 backdrop-blur-md sm:px-8">
        <div className="flex items-center gap-2">
          <span className="text-xl font-extrabold tracking-tight">SGE</span>
          <Badge variant="secondary" className="bg-primary/10 font-semibold text-primary border-primary/20">
            <Sparkles className="mr-1 h-3 w-3" /> Premium
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
        <section className="relative py-20 text-center sm:py-28 lg:py-36">
          <div className="container relative z-10 mx-auto px-4">
            <Badge
              variant="outline"
              className="mb-6 inline-flex items-center gap-1.5 rounded-full border-primary/30 bg-primary/5 px-4 py-1.5 text-sm text-primary transition-colors hover:bg-primary/10"
            >
              <ShieldCheck className="h-4 w-4" /> A evolução da sua gestão acadêmica
            </Badge>

            <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
              Eleve sua Gestão a um{" "}
              <span className="bg-gradient-to-r from-primary via-purple-500 to-indigo-500 bg-clip-text text-transparent">
                Novo Patamar
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Desbloqueie ferramentas poderosas de automação, análise predictiva com IA e suporte exclusivo para escalar sua instituição.
            </p>

            <div className="mt-10 flex items-center justify-center gap-4">
              <Button size="lg" className="group h-12 px-8 text-base shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30">
                <Rocket className="mr-2 h-5 w-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                Quero ser Premium
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="relative border-y border-border/40 bg-muted/20 py-20 sm:py-28 backdrop-blur-sm">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Tudo o que sua rede precisa para crescer
              </h2>
              <p className="mt-4 text-base text-muted-foreground sm:text-lg">
                Recursos construídos sob medida para garantir eficiência operacional, segurança e inteligência no dia a dia.
              </p>
            </div>

            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <Card
                  key={feature.title}
                  className="group relative overflow-hidden border-border/50 bg-background/50 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
                >
                  <CardHeader>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="mt-4 text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20 sm:py-28">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Planos transparentes e escaláveis</h2>
              <p className="mt-4 text-base text-muted-foreground sm:text-lg">
                Escolha a opção ideal para o momento atual e escale conforme sua instituição expande.
              </p>
            </div>

            <div className="mt-16 grid max-w-lg gap-8 mx-auto lg:max-w-4xl lg:grid-cols-2">
              {pricingTiers.map((tier) => (
                <Card
                  key={tier.name}
                  className={`relative flex flex-col justify-between overflow-hidden border-border/60 transition-all duration-300 ${
                    tier.featured
                      ? "border-primary/80 bg-background shadow-2xl shadow-primary/10 ring-1 ring-primary/50"
                      : "bg-background/60 backdrop-blur-sm"
                  }`}
                >
                  {tier.featured && (
                    <div className="absolute right-0 top-0">
                      <span className="flex items-center gap-1 rounded-bl-xl bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                        <Sparkles className="h-3 w-3" /> Mais Popular
                      </span>
                    </div>
                  )}

                  <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-2xl font-bold">{tier.name}</CardTitle>
                    <CardDescription className="min-h-[40px] mt-2 text-sm">{tier.description}</CardDescription>
                    
                    <div className="mt-6 flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold tracking-tight">{tier.price}</span>
                      {tier.period && <span className="text-muted-foreground font-medium">{tier.period}</span>}
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 p-8 pt-4">
                    <div className="my-6 border-t border-border/40" />

                    <ul className="space-y-3.5">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-3 text-sm">
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-foreground/90">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <div className="p-8 pt-0 mt-auto">
                    <Button
                      className={`w-full h-11 text-base font-medium ${
                        tier.featured ? "shadow-md shadow-primary/20" : ""
                      }`}
                      variant={tier.featured ? "default" : "outline"}
                      size="lg"
                    >
                      {tier.cta}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/20 py-8 backdrop-blur-sm">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} SGE Acadêmico. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
