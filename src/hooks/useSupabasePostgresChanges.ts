import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

type PostgresEventType = "INSERT" | "UPDATE" | "DELETE";

type PostgresChangesPayload = {
  eventType: PostgresEventType;
  new?: any;
  old?: any;
};

type UseSupabasePostgresChangesArgs = {
  channelKey: string;
  table: string;
  schema?: string;
  events: PostgresEventType[];
  filter?: string;
  enabled?: boolean;
  throttleMs?: number;
  onPayload: (payload: PostgresChangesPayload) => void;
};

/**
 * Subscribes to Supabase Postgres changes with:
 * - server-side row filtering (when `filter` is provided)
 * - proper channel cleanup (prevents memory leaks)
 * - optional throttling (prevents re-render storms)
 * - pause/resume when the tab is hidden (battery-friendly)
 */
export function useSupabasePostgresChanges({
  channelKey,
  table,
  schema = "public",
  events,
  filter,
  enabled = true,
  throttleMs,
  onPayload,
}: UseSupabasePostgresChangesArgs) {
  const onPayloadRef = useRef(onPayload);
  onPayloadRef.current = onPayload;

  const throttleStateRef = useRef<{
    timerId: ReturnType<typeof setTimeout> | null;
    pendingPayload: PostgresChangesPayload | null;
  }>({ timerId: null, pendingPayload: null });

  useEffect(() => {
    if (!enabled) return;

    let channel = supabase.channel(channelKey);

    const handlePayload = (payload: any) => {
      const normalized: PostgresChangesPayload = {
        eventType: payload.eventType,
        new: payload.new,
        old: payload.old,
      };

      if (!throttleMs) {
        onPayloadRef.current(normalized);
        return;
      }

      // Throttle: keep the latest payload and deliver it at most once per `throttleMs`.
      throttleStateRef.current.pendingPayload = normalized;
      if (throttleStateRef.current.timerId) return;

      throttleStateRef.current.timerId = setTimeout(() => {
        throttleStateRef.current.timerId = null;
        const latest = throttleStateRef.current.pendingPayload;
        throttleStateRef.current.pendingPayload = null;
        if (latest) onPayloadRef.current(latest);
      }, throttleMs);
    };

    // Attach handlers for requested event types.
    for (const eventType of events) {
      channel = channel.on(
        "postgres_changes",
        {
          event: { type: eventType, schema, table },
          filter: filter ?? undefined,
        },
        handlePayload
      );
    }

    const start = () => {
      if (document.visibilityState !== "visible") return;
      channel.subscribe();
    };

    const stop = () => {
      throttleStateRef.current.pendingPayload = null;
      if (throttleStateRef.current.timerId) {
        clearTimeout(throttleStateRef.current.timerId);
        throttleStateRef.current.timerId = null;
      }
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };

    if (document.visibilityState === "visible") {
      start();
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") stop();
      else {
        // Re-create channel after pausing so we don't re-use a closed subscription.
        channel = supabase.channel(channelKey);
        for (const eventType of events) {
          channel = channel.on(
            "postgres_changes",
            {
              event: { type: eventType, schema, table },
              filter: filter ?? undefined,
            },
            handlePayload
          );
        }
        start();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    channelKey,
    enabled,
    events.join(","),
    schema,
    table,
    filter,
    throttleMs,
  ]);
}

