import { Construction } from "lucide-react";

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md border border-border bg-surface text-brand">
        <Construction className="h-5 w-5" />
      </div>
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Coming next
      </span>
    </div>
  );
}
