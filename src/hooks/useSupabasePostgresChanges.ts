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

      throttleStateRef.current.pendingPayload = normalized;
      if (throttleStateRef.current.timerId) return;

      throttleStateRef.current.timerId = setTimeout(() => {
        throttleStateRef.current.timerId = null;
        const latest = throttleStateRef.current.pendingPayload;
        throttleStateRef.current.pendingPayload = null;
        if (latest) onPayloadRef.current(latest);
      }, throttleMs);
    };

    const channelConfig: Record<string, string> = { event: events.join(","), schema, table };
    if (filter) channelConfig.filter = filter;

    const channel = supabase
      .channel(channelKey)
      .on(
        "postgres_changes" as any,
        channelConfig as any,
        handlePayload,
      )
      .subscribe();

    return () => {
      throttleStateRef.current.pendingPayload = null;
      if (throttleStateRef.current.timerId) {
        clearTimeout(throttleStateRef.current.timerId);
        throttleStateRef.current.timerId = null;
      }
      supabase.removeChannel(channel);
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
