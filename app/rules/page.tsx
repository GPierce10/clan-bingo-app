import { supabase } from "../../lib/supabase";

export default async function RulesPage() {
  const { data: activeEvent, error } = await supabase
    .from("events")
    .select("id, name, rules_text")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !activeEvent) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold">Rules</h1>
          <p className="mt-4 text-red-400">
            {error?.message ?? "No active event found."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold mb-2">{activeEvent.name} Rules</h1>
        <p className="text-zinc-400 mb-8">
          Official event rules, scoring notes, and clarifications.
        </p>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          {activeEvent.rules_text?.trim() ? (
            <div className="whitespace-pre-wrap leading-7 text-zinc-100">
              {activeEvent.rules_text}
            </div>
          ) : (
            <p className="text-zinc-400">No rules have been added yet.</p>
          )}
        </div>
      </div>
    </main>
  );
}