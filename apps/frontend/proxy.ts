import { NextResponse } from "next/server";

import { GET_INSTANCE_SETUP_REQUIRED } from "#app/_queries/get-instance-setup-required.query.ts";
import { privateEnvironment } from "#environment/private-environment.schema.ts";
import { authClient } from "#lib/auth/client.ts";
import { getClient } from "#lib/graphql/client.ts";

import type { AppRoutes, RedirectRoutes } from "./.next/types/routes";
import type { NextRequest, ProxyConfig } from "next/server";

const paths = {
  login: "/login",
  home: "/",
  instanceSetup: "/setup",
} as const satisfies Record<string, AppRoutes | RedirectRoutes>;

const client = getClient();

export default async function proxy(request: NextRequest) {
  if (
    request.nextUrl.pathname === "/graphql" ||
    request.nextUrl.pathname.startsWith("/api/auth")
  ) {
    const rewriteUrl = new URL(
      request.nextUrl.pathname,
      privateEnvironment.BACKEND_URL,
    );

    return NextResponse.rewrite(rewriteUrl);
  }

  let session;
  try {
    const result = await authClient.getSession();
    session = result?.data;
  } catch {
    // If auth fails (e.g., backend unavailable), treat as unauthenticated
    session = null;
  }

  if (!session && request.nextUrl.pathname !== paths.login) {
    return NextResponse.redirect(new URL(paths.login, request.url));
  } else if (session && request.nextUrl.pathname === paths.login) {
    return NextResponse.redirect(new URL(paths.home, request.url));
  } else if (session?.user.role === "admin") {
    let setupRequired = false;
    try {
      const { data } = await client.query({ query: GET_INSTANCE_SETUP_REQUIRED });
      setupRequired = data?.instanceStatus.setupRequired ?? false;
    } catch {
      // If query fails, assume setup is not required to avoid blocking access
      setupRequired = false;
    }

    if (
      !request.nextUrl.pathname.startsWith(paths.instanceSetup) &&
      setupRequired
    ) {
      return NextResponse.redirect(new URL(paths.instanceSetup, request.url));
    } else if (
      request.nextUrl.pathname.startsWith(paths.instanceSetup) &&
      !setupRequired
    ) {
      return NextResponse.redirect(new URL(paths.home, request.url));
    }
  }

  return NextResponse.next();
}

export const config: ProxyConfig = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
