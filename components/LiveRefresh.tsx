"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function LiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    let refreshTimeout: number | undefined;

    const queueRefresh = () => {
      window.clearTimeout(refreshTimeout);
      refreshTimeout = window.setTimeout(() => {
        router.refresh();
      }, 250);
    };

    const channel = supabase
      .channel("live-refresh-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "submissions" },
        queueRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "submission_players" },
        queueRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tiles" },
        queueRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teams" },
        queueRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        queueRefresh
      )
      .subscribe();

    return () => {
      window.clearTimeout(refreshTimeout);
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}