"use client";

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getClient } from "#lib/graphql/client.ts";

import type { PropsWithChildren } from "react";
import type { ApolloClient } from "@apollo/client";

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: "movie" | "show" | "season" | "episode";
  severity: "success" | "warning" | "error";
  year?: number;
  duration?: number;
  imdb_id?: string;
  read: boolean;
  count: number;
  dedupeKey: string | null;
}

export interface NotificationsContextValue {
  notifications: Notification[];
  reconnect: () => void;
  unreadCount: number;
  connectionStatus: "connected" | "disconnected" | "connecting" | "error";
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clear: () => void;
  remove: (notificationId: string) => void;
}

const SEVERITY_MAP: Record<string, "success" | "warning" | "error"> = {
  completed: "success",
  downloaded: "success",
  scraped: "success",
  indexed: "warning",
  failed: "error",
  paused: "warning",
  released: "success",
  unreleased: "warning",
  ongoing: "warning",
  unknown: "warning",
};

const TYPE_FROM_STATE: Record<string, "movie" | "show" | "season" | "episode"> = {
  Movie: "movie",
  Show: "show",
  Season: "season",
  Episode: "episode",
};

export function NotificationsProvider({ children }: PropsWithChildren) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "connecting" | "error"
  >("connecting");
  const clientRef = useRef<ApolloClient | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Create a client instance for subscriptions (non-RSC)
  useEffect(() => {
    let cancelled = false;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    async function connect() {
      if (cancelled) return;
      setConnectionStatus("connecting");

      try {
        const client = getClient();
        clientRef.current = client;

        // Subscribe to media item state changes
        const mediaSub = client.subscribe({
          query: `
            subscription OnMediaItemStateChanged {
              mediaItemStateChanged {
                ... on MediaItem {
                  __typename
                  id
                  state
                  title
                  type
                  year
                }
              }
            }
          `,
        }).subscribe({
          next: (result) => {
            const data = result.data?.mediaItemStateChanged;
            if (!data) return;

            const typename = (data as any).__typename;
            const state = (data as any).state;
            const title = (data as any).title;
            const type = TYPE_FROM_STATE[typename] ?? "movie";
            const year = (data as any).year;

            const severity = SEVERITY_MAP[state] ?? "warning";

            const notification: Notification = {
              id: `${data.id}-${Date.now()}`,
              title: title ?? "Media Updated",
              message: `Status changed to ${state}`,
              timestamp: new Date().toISOString(),
              type,
              severity,
              year,
              read: false,
              count: 1,
              dedupeKey: `${data.id}-${state}`,
            };

            setNotifications((prev) => {
              // Deduplicate
              const existing = prev.find(
                (n) => n.dedupeKey === notification.dedupeKey && !n.read
              );
              if (existing) {
                return prev.map((n) =>
                  n.id === existing.id
                    ? { ...n, count: n.count + 1 }
                    : n
                );
              }
              return [notification, ...prev];
            });
          },
          error: (err) => {
            console.error("Notification subscription error:", err);
          },
        });

        if (!cancelled) {
          unsubscribeRef.current = () => mediaSub.unsubscribe();
          setConnectionStatus("connected");
        }
      } catch (err) {
        console.error("Failed to connect to notifications:", err);
        if (!cancelled) {
          setConnectionStatus("error");
          reconnectTimeout = setTimeout(connect, 5000);
        }
      }
    }

    connect();

    return () => {
      cancelled = true;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clear = useCallback(() => {
    setNotifications([]);
  }, []);

  const remove = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const reconnect = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    setConnectionStatus("connecting");
    // The useEffect will reconnect automatically
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      reconnect,
      connectionStatus,
      unreadCount,
      clear,
      markAllAsRead,
      markAsRead,
      remove,
    }),
    [
      notifications,
      reconnect,
      connectionStatus,
      unreadCount,
      clear,
      markAllAsRead,
      markAsRead,
      remove,
    ],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export const NotificationsContext = createContext<
  NotificationsContextValue | undefined
>(undefined);

export function useNotificationsContext() {
  const context = use(NotificationsContext);

  if (!context) {
    throw new Error(
      "useNotificationsContext must be used within a NotificationsProvider",
    );
  }

  return context;
}
