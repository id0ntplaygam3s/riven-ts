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

/**
 * Hook that promotes the first registered user to admin role.
 * This ensures the initial setup user has full admin access.
 */
const isFirstUserAdminHook = {
  hooks: {
    after: [
      {
        matcher() {
          return true;
        },
        handler: async (event) => {
          // Only trigger on successful user sign up
          if (
            event.context.action !== "create-user" ||
            event.context.httpRequest?.method !== "POST"
          ) {
            return;
          }

          // Check if this is the first user by counting existing users
          const db = event.context.adapter;
          if (!db) return;

          try {
            // Use the database to count users
            const countResult = await db
              .find({
                table: "user",
                where: [],
                orderBy: [],
              })
              .then((r: unknown[]) => r.length);

            if (countResult === 1) {
              // This is the first user — set their role to admin
              const userId = event.context.data?.id as string;
              if (userId) {
                await db
                  .update({
                    table: "user",
                    where: [
                      {
                        field: "id",
                        value: userId,
                      },
                    ],
                    data: {
                      role: "admin",
                    },
                  })
                  .catch(() => {});
              }
            }
          } catch {
            // Silently fail — don't block user creation
          }
        },
      },
    ],
  },
};

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
  hooks: {
    after: isFirstUserAdminHook.hooks.after,
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

  return auth;
}
