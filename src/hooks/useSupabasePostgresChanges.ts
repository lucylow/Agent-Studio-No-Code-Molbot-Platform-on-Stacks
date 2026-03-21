import { useEffect, useRef } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/realtime-js";
import { supabase } from "@/integrations/supabase/client";

type PostgresEventType = "INSERT" | "UPDATE" | "DELETE";

type RowRecord = Record<string, unknown>;

type PostgresChangesPayload = {
  eventType: PostgresEventType;
  new?: RowRecord;
  old?: RowRecord;
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

function nonEmptyRecord(obj: unknown): RowRecord | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const rec = obj as Record<string, unknown>;
  return Object.keys(rec).length > 0 ? rec : undefined;
}

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

    const handlePayload = (payload: RealtimePostgresChangesPayload<RowRecord>) => {
      const normalized: PostgresChangesPayload = {
        eventType: payload.eventType as PostgresEventType,
        new: nonEmptyRecord(payload.new),
        old: nonEmptyRecord(payload.old),
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

    let channel = supabase.channel(channelKey);
    for (const ev of events) {
      channel = channel.on("postgres_changes", { event: ev, schema, table, ...(filter ? { filter } : {}) }, handlePayload);
    }

    channel.subscribe();

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
