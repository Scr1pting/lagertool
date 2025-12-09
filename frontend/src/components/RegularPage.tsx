import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface RegularPageProps {
  title: string;
  description?: ReactNode;
  children: ReactNode
}

function RegularPage({ title, description = undefined, children }: RegularPageProps) {
  return (
    <main className={cn("mx-auto w-full max-w-[850px] px-5 py-15")}>
      <header className="flex flex-col pb-4 gap-2">
        <h1 className="text-3xl font-semibold">{title}</h1>
        {description !== undefined && description}
      </header>

      {children}
    </main>
  );
}

export default RegularPage;
