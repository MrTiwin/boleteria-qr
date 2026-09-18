import Link from "next/link";

export function BackHomeLink() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-150 hover:text-primary"
    >
      ← Inicio
    </Link>
  );
}
