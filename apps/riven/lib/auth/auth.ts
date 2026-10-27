// Provides types needed to squash portability errors from @better-auth/passkey
// oxlint-disable-next-line import/no-unassigned-import
import "@simplewebauthn/server";
import { ac, admin, manager, user } from "@repo/util-auth/access-control";

import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { mikroOrmAdapter } from "better-auth-mikro-orm";
import {
  admin as adminPlugin,
  genericOAuth,
  lastLoginMethod,
  openAPI,
  username,
} from "better-auth/plugins";
import { Duration } from "luxon";

import { frontendSettings } from "#utilities/frontend-settings.ts";
import { withLogContext } from "#utilities/logger/log-context.ts";
import { logger } from "#utilities/logger/logger.ts";
import { settings } from "#utilities/settings.ts";

import { getGenericOAuthProviders } from "./oauth-utils.ts";
import { defaultPlexOptions, plexOAuth } from "./plex-oauth.ts";

import type { MikroORM } from "@mikro-orm/core";
import type { Auth, BetterAuthOptions, LogLevel } from "better-auth";
import type { AdapterFactory } from "better-auth/adapters";

const transformLogLevel = (): Exclude<LogLevel, "success"> => {
  switch (settings.logLevel) {
    case "silly":
    case "verbose": {
      return "debug";
    }
    case "http": {
      return "info";
    }
    case "debug":
    case "info":
    case "warn":
    case "error": {
      return settings.logLevel;
    }
  }
};

export const authConfig = {
  secret: frontendSettings.authSecret,
  baseURL: `http://${settings.host}:${settings.port.toString()}`,
  logger: {
    disabled: !settings.loggingEnabled,
    level: transformLogLevel(),
    log(level, message, ...args: unknown[]) {
      withLogContext({ "riven.log.source": "auth" }, () => {
        logger[level](message, ...args);
      });
    },
  },
  user: {
    changeEmail: {
      enabled: true,
    },
    deleteUser: {
      enabled: true,
    },
  },
  plugins: [
    username(),
    adminPlugin({
      ac,
      roles: {
        admin,
        user,
        manager,
      },
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
    openAPI(),
    passkey({
      rpID: frontendSettings.passkeyRpId,
      rpName: frontendSettings.passkeyRpName,
      origin: frontendSettings.origin,
    }),
    lastLoginMethod({ storeInDatabase: true }),
    genericOAuth({
      config: [
        ...(!frontendSettings.disablePlex && frontendSettings.plexClientId
          ? [
              plexOAuth({
                ...defaultPlexOptions,
                baseURL: frontendSettings.origin,
              }),
            ]
          : []),
        ...getGenericOAuthProviders(process.env),
      ],
    }),
  ],
  account: {
    accountLinking: {
      enabled: true,
      allowDifferentEmails: true,
      trustedProviders: [
        ...(frontendSettings.disablePlex ? [] : ["plex"]),
        ...getGenericOAuthProviders(process.env).map(
          (provider) => provider.providerId,
        ),
      ],
    },
    encryptOAuthTokens: true,
  },
  emailAndPassword: {
    enabled: !frontendSettings.disableEmailPassword,
    disableSignUp: !frontendSettings.enableEmailPasswordSignup,
  },
  socialProviders: {},
  trustedOrigins: [
    "http://localhost:9000",
    "https://localhost:9000",
    "http://192.168.1.*:9000",
    "https://192.168.1.*:9000",
    frontendSettings.origin,
  ],
  advanced: {
    cookiePrefix: "riven",
    database: {
      generateId: false as const,
    },
  },
  telemetry: {
    enabled: false,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: Duration.fromObject({ minutes: 1 }).as("seconds"),
    },
  },
} satisfies BetterAuthOptions;

// oxlint-disable-next-line import/no-mutable-exports init-declarations
export let auth: Auth<
  typeof authConfig & { database: AdapterFactory<BetterAuthOptions> }
>;

export function initAuth(orm: MikroORM): typeof auth {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  auth ??= betterAuth({
    ...authConfig,
    database: mikroOrmAdapter(orm),
  });

  // Promote first registered user to admin
  promoteFirstUserToAdmin(orm);

  return auth;
}

/**
 * Promotes the first registered user to admin role.
 * This ensures the initial setup user has full admin access.
 */
async function promoteFirstUserToAdmin(orm: MikroORM): Promise<void> {
  try {
    const em = orm.em.fork();
    const users = await em.find(
      // @ts-expect-error User entity type resolved at runtime
      "User",
      {},
      { orderBy: { createdAt: "asc" }, limit: 1 },
    );

    if (users.length > 0) {
      const firstUser = users[0];
      // @ts-expect-error role property resolved at runtime
      if (!firstUser.role || firstUser.role === "user") {
        // @ts-expect-error role property resolved at runtime
        firstUser.role = "admin";
        await em.flush();
        logger.info("First user promoted to admin role");
      }
    }
  } catch (error) {
    // Silently fail — don't block auth initialization
    logger.debug("First-user admin promotion skipped", { err: error });
  }
}
