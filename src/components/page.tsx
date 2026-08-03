import * as React from "react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
};

export function PageHeader({
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between border-b px-6 py-5">
      <div>
        {title}

        {description && (
          <div className="mt-0.5 text-sm text-muted-foreground">
            {description}
          </div>
        )}
      </div>

      {actions && (
        <div className="flex shrink-0 items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

type PageBodyProps = {
  children: React.ReactNode;
  className?: string;
};

export function PageBody({
  children,
  className,
}: PageBodyProps) {
  return (
    <div className={cn("p-6", className)}>
      {children}
    </div>
  );
}