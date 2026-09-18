import "dotenv/config";
import { readFileSync } from "node:fs";
import { importPersonnel } from "../src/lib/import-personnel.ts";

// Standalone script, run with `pnpm exec tsx scripts/import-personnel.ts --file {path}`. Not
// booted by the Next.js framework, so it loads .env itself — see CLAUDE.md, "Environment".
function parseArgs(argv: string[]): { file: string } {
  const fileIndex = argv.indexOf("--file");
  if (fileIndex === -1 || !argv[fileIndex + 1]) {
    throw new Error(
      "Usage: tsx scripts/import-personnel.ts --file <path/to/listado.csv>",
    );
  }
  return { file: argv[fileIndex + 1] };
}

async function main() {
  const { file } = parseArgs(process.argv.slice(2));
  const csvContent = readFileSync(file, "utf-8");
  const result = await importPersonnel(csvContent);

  if (!result.ok) {
    console.error(`Import rejected — ${result.errors.length} error(s):`);
    for (const error of result.errors) {
      const field = error.field ? ` [${error.field}]` : "";
      console.error(`  row ${error.row}${field}: ${error.message}`);
    }
    process.exit(1);
  }

  console.log(`Imported ${result.count} personnel row(s).`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
