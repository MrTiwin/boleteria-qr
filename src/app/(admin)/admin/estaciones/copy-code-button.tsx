"use client";

import { useState } from "react";

export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="h-9 shrink-0 rounded-lg border border-primary px-3 text-sm font-medium text-primary transition-colors duration-150 hover:bg-primary/10"
    >
      {copied ? "¡Copiado!" : "Copiar código"}
    </button>
  );
}
