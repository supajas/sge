"use client";

import { ComponentType } from "react";
import { LucideProps } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

type PickListItem = {
  id: string;
  name: string;
  hint?: string;
};

type PickListProps = {
  title: string;
  subtitle: string;
  stepNumber: number;
  icon: ComponentType<LucideProps>;
  items: PickListItem[];
  isLoading?: boolean;
  onSelect: (id: string) => void;
  onBack?: () => void;
  empty?: string;
};

export function PickList({
  title,
  subtitle,
  stepNumber,
  icon: Icon,
  items,
  isLoading,
  onSelect,
  onBack,
  empty = "Nenhum item encontrado.",
}: PickListProps) {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="space-y-1">
        <div className="flex items-center space-x-3">
          {onBack && (
            <Button size="icon" variant="outline" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-muted-foreground">
              Passo {stepNumber} de 4
            </div>
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
        </div>
        <p className="text-sm text-muted-foreground pt-1">{subtitle}</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Carregando opções...
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground border border-dashed rounded-md">
            {empty}
          </div>
        ) : (
          <div className="grid gap-2">
            {items.map((item) => (
              <Button
                key={item.id}
                variant="outline"
                className="w-full justify-between h-auto py-3 px-4 text-left font-normal hover:border-primary hover:bg-accent"
                onClick={() => onSelect(item.id)}
              >
                <span className="font-medium text-foreground">{item.name}</span>
                {item.hint && (
                  <span className="text-xs text-muted-foreground">{item.hint}</span>
                )}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
