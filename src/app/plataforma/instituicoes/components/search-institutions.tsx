"use client";

import { useRouter, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchInstitutions({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="relative w-full sm:w-72">
      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
      <Input
        placeholder="Buscar por nome da instituição..."
        defaultValue={defaultValue}
        className="h-9 pl-8 text-sm"
        onChange={(e) => {
          const params = new URLSearchParams(window.location.search);
          if (e.target.value) {
            params.set("q", e.target.value);
          } else {
            params.delete("q");
          }
          router.replace(`${pathname}?${params.toString()}`);
        }}
      />
    </div>
  );
}
