"use client";

import { ArrowLeft, Zap, Building, BarChart, Bot, Sparkles, Rocket } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: Building,
    title: "Multi-Instituição",
    description: "Gerencie múltiplas unidades, filiais ou campi a partir de uma única conta, com total separação de dados.",
  },
  {
    icon: BarChart,
    title: "Relatórios Avançados",
    description: "Acesse dashboards com insights sobre matrículas, desempenho acadêmico e previsões de evasão.",
  },
  {
    icon: Bot,
    title: "Automação com IA",
    description: "Automatize tarefas repetitivas, como a criação de turmas e a alocação de professores, com nossa IA.",
  },
  {
    icon: Sparkles,
    title: "Atendimento Prioritário",
    description: "Tenha acesso a um gerente de contas dedicado e suporte técnico especializado via chat e telefone.",
  },
];

const pricingTiers = [
  {
    name: "Pro",
    price: "R$ 299",
    period: "/mês",
    description: "Para instituições em crescimento que buscam mais poder e automação.",
    features: ["Até 5 instituições", "Relatórios Avançados", "Suporte via Email e Chat"],
    cta: "Começar com Pro",
  },
  {
    name: "Enterprise",
    price: "Customizado",
    period: "",
    description: "Soluções sob medida para grandes redes de ensino com necessidades específicas.",
    features: ["Instituições Ilimitadas", "Automação com IA", "Suporte Prioritário 24/7", "Treinamento Dedicado"],
    cta: "Fale com um especialista",
    featured: true,
  },
];

export default function PremiumPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <h1 className="text-xl font-bold">SGE <span className="text-primary">Premium</span></h1>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Dashboard
          </Link>
        </Button>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 text-center sm:py-24 lg:py-32" style={{ animation: `fadeInUp 0.5s ease-out forwards` }}>
          <div className="container px-4">
            <Badge variant="secondary" className="mb-4">A evolução da sua gestão</Badge>
            <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Eleve sua Gestão a um Novo Patamar
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Desbloqueie ferramentas poderosas de automação, análise de dados com IA e suporte prioritário para levar sua instituição ao sucesso.
            </p>
            <div className="mt-8">
              <Button size="lg">
                <Rocket className="mr-2 h-5 w-5" />
                Quero ser Premium!
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-muted/40 py-20 sm:py-24">
          <div className="container px-4">
            <div className="mx-auto max-w-3xl text-center">
              <h3 className="text-3xl font-bold tracking-tight">Tudo que você precisa para crescer</h3>
              <p className="mt-4 text-lg text-muted-foreground">
                O SGE Premium foi desenhado para escalar com a sua instituição, oferecendo controle e inteligência.
              </p>
            </div>
            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, index) => (
                <Card
                  key={feature.title}
                  className="text-center"
                  style={{
                    animation: `fadeInUp 0.5s ease-out forwards`,
                    animationDelay: `${200 + index * 100}ms`,
                    opacity: 0,
                  }}
                >
                  <CardHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="mt-4">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20 sm:py-24">
          <div className="container px-4">
            <div className="mx-auto max-w-3xl text-center">
              <h3 className="text-3xl font-bold tracking-tight">Planos e Preços</h3>
              <p className="mt-4 text-lg text-muted-foreground">
                Escolha o plano que melhor se adapta ao momento da sua instituição.
              </p>
            </div>
            <div className="mt-16 grid max-w-md gap-8 mx-auto lg:max-w-4xl lg:grid-cols-2">
              {pricingTiers.map((tier, index) => (
                <Card
                  key={tier.name}
                  className={tier.featured ? "border-2 border-primary shadow-lg" : ""}
                  style={{
                    animation: `fadeInUp 0.5s ease-out forwards`,
                    animationDelay: `${400 + index * 100}ms`,
                    opacity: 0,
                  }}
                >
                  <CardHeader className="p-8">
                    {tier.featured && <Badge className="absolute top-0 -translate-y-1/2">Mais Popular</Badge>}
                    <CardTitle className="text-2xl">{tier.name}</CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">{tier.price}</span>
                      {tier.period && <span className="text-muted-foreground">{tier.period}</span>}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{tier.description}</p>
                  </CardHeader>
                  <CardContent className="p-8 pt-0">
                    <ul className="space-y-3">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-primary" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button className="w-full mt-8" size="lg" variant={tier.featured ? "default" : "outline"}>
                      {tier.cta}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/40 py-8">
        <div className="container px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} SGE Acadêmico. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
