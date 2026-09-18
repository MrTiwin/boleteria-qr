import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Next.js 16 renamed middleware.ts to proxy.ts (see ts-node.md Gotchas) — the exported function
// is `proxy`, not `middleware`. Runs on the Node.js runtime by default, so `auth.api.getSession`
// (which needs a real database connection) works here.
export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
