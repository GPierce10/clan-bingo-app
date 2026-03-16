"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../../lib/supabase";

type TeamRecord = {
  id: string;
  event_id: string;
  passcode: string;
};

type TileRecord = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  mvp_points: number;
  show_clarification: boolean;
};

type SubmissionRecord = {
  id: string;
  proof_url: string | null;
  notes: string | null;
  created_at?: string;
};

type SubmissionPlayerRecord = {
  id: string;
  player_name: string;
  points_awarded: number;
  contribution_percent: number | null;
};

type TeamPlayerRecord = {
  id: string;
  player_name: string;
  display_order: number;
};

type TilePageProps = {
  params: Promise<{
    slug: string;
    tileId: string;
  }>;
};

function buildEqualPercents(playerNames: string[]) {
  if (playerNames.length === 0) return {} as Record<string, number>;

  const base = Math.floor(100 / playerNames.length);
  let remainder = 100 - base * playerNames.length;

  const result: Record<string, number> = {};

  for (const name of playerNames) {
    const extra = remainder > 0 ? 1 : 0;
    result[name] = base + extra;
    if (remainder > 0) remainder--;
  }

  return result;
}

function calculatePointsFromPercents(
  totalPoints: number,
  selectedPlayers: string[],
  percents: Record<string, number>
) {
  if (selectedPlayers.length === 0) {
    return {} as Record<string, number>;
  }

  const raw = selectedPlayers.map((player) => {
    const percent = percents[player] ?? 0;
    const exact = (totalPoints * percent) / 100;
    const floored = Math.floor(exact);
    const remainder = exact - floored;

    return {
      player,
      floored,
      remainder,
    };
  });

  const result: Record<string, number> = {};
  let used = 0;

  for (const row of raw) {
    result[row.player] = row.floored;
    used += row.floored;
  }

  let leftover = totalPoints - used;

  raw.sort((a, b) => {
    if (b.remainder !== a.remainder) return b.remainder - a.remainder;
    return a.player.localeCompare(b.player);
  });

  let i = 0;
  while (leftover > 0 && raw.length > 0) {
    result[raw[i].player] += 1;
    leftover--;
    i = (i + 1) % raw.length;
  }

  return result;
}

export default function TilePage({ params }: TilePageProps) {
  const { slug, tileId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<TeamRecord | null>(null);
  const [tile, setTile] = useState<TileRecord | null>(null);
  const [submission, setSubmission] = useState<SubmissionRecord | null>(null);
  const [submissionPlayers, setSubmissionPlayers] = useState<
    SubmissionPlayerRecord[]
  >([]);
  const [teamPlayers, setTeamPlayers] = useState<TeamPlayerRecord[]>([]);

  const [passcode, setPasscode] = useState("");
  const [proof, setProof] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [playerPercents, setPlayerPercents] = useState<Record<string, number>>(
    {}
  );

  useEffect(() => {
    const loadPage = async () => {
      setLoading(true);
      setStatus("");

      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("id, event_id, passcode")
        .eq("slug", slug)
        .single();

      if (teamError || !teamData) {
        setStatus("Team not found.");
        setLoading(false);
        return;
      }

      setTeam(teamData);

      const { data: rosterData, error: rosterError } = await supabase
        .from("team_players")
        .select("id, player_name, display_order")
        .eq("team_id", teamData.id)
        .order("display_order", { ascending: true })
        .order("player_name", { ascending: true });

      if (rosterError) {
        setStatus(rosterError.message);
        setLoading(false);
        return;
      }

      setTeamPlayers(rosterData ?? []);

      const { data: tileData, error: tileError } = await supabase
        .from("tiles")
        .select("id, title, description, image_url, mvp_points, show_clarification")
        .eq("id", tileId)
        .single();

      if (tileError || !tileData) {
        setStatus("Tile not found.");
        setLoading(false);
        return;
      }

      setTile(tileData);

      const { data: submissionData, error: submissionError } = await supabase
        .from("submissions")
        .select("id, proof_url, notes, created_at")
        .eq("team_id", teamData.id)
        .eq("tile_id", tileId)
        .eq("is_active", true)
        .maybeSingle();

      if (submissionError) {
        setStatus(submissionError.message);
        setLoading(false);
        return;
      }

      if (submissionData) {
        setSubmission(submissionData);
        setProof(submissionData.proof_url ?? "");
        setNotes(submissionData.notes ?? "");

        const { data: playerRows, error: playerError } = await supabase
          .from("submission_players")
          .select("id, player_name, points_awarded, contribution_percent")
          .eq("submission_id", submissionData.id);

        if (playerError) {
          setStatus(playerError.message);
          setLoading(false);
          return;
        }

        setSubmissionPlayers(playerRows ?? []);
      } else {
        setSubmission(null);
        setSubmissionPlayers([]);
      }

      setLoading(false);
    };

    loadPage();
  }, [slug, tileId]);

  const togglePlayer = (playerName: string) => {
    setSelectedPlayers((current) => {
      const exists = current.includes(playerName);

      if (exists) {
        const updated = current.filter((p) => p !== playerName);
        const equalized = buildEqualPercents(updated);
        setPlayerPercents(equalized);
        return updated;
      }

      const updated = [...current, playerName];
      const equalized = buildEqualPercents(updated);
      setPlayerPercents(equalized);
      return updated;
    });
  };

  const updatePercent = (playerName: string, value: string) => {
    const parsed = Number(value);

    setPlayerPercents((current) => ({
      ...current,
      [playerName]: Number.isFinite(parsed) ? parsed : 0,
    }));
  };

  const percentTotal = useMemo(() => {
    return selectedPlayers.reduce(
      (sum, player) => sum + (playerPercents[player] ?? 0),
      0
    );
  }, [selectedPlayers, playerPercents]);

  const calculatedPoints = useMemo(() => {
    if (!tile) return {} as Record<string, number>;

    return calculatePointsFromPercents(
      tile.mvp_points,
      selectedPlayers,
      playerPercents
    );
  }, [tile, selectedPlayers, playerPercents]);

  const completedDisplayPoints = useMemo(() => {
  if (!tile || submissionPlayers.length === 0) {
    return {} as Record<string, number>;
  }

  const playersWithPercents = submissionPlayers.filter(
    (player) => player.contribution_percent !== null
  );

  if (playersWithPercents.length !== submissionPlayers.length) {
    return Object.fromEntries(
      submissionPlayers.map((player) => [player.player_name, player.points_awarded])
    );
  }

  const percents = Object.fromEntries(
    playersWithPercents.map((player) => [
      player.player_name,
      player.contribution_percent ?? 0,
    ])
  );

  return calculatePointsFromPercents(
    tile.mvp_points,
    playersWithPercents.map((player) => player.player_name),
    percents
  );
}, [tile, submissionPlayers]);

  const handleSubmit = async () => {
    if (!team || !tile) return;

    setStatus("Submitting...");

    if (passcode !== team.passcode) {
      setStatus("Wrong team passcode.");
      return;
    }

    if (submission) {
      setStatus("That tile is already completed for this team.");
      return;
    }

    if (selectedPlayers.length === 0) {
      setStatus("Select at least one player.");
      return;
    }

    if (percentTotal !== 100) {
      setStatus("Contribution percentages must total exactly 100.");
      return;
    }

    for (const player of selectedPlayers) {
      const pct = playerPercents[player] ?? 0;
      if (!Number.isInteger(pct) || pct < 0) {
        setStatus("All contribution percentages must be whole numbers 0 or higher.");
        return;
      }
    }

    const { data: newSubmission, error: submissionError } = await supabase
      .from("submissions")
      .insert({
        event_id: team.event_id,
        team_id: team.id,
        tile_id: tile.id,
        proof_url: proof,
        notes,
        is_active: true,
      })
      .select("id, proof_url, notes, created_at")
      .single();

    if (submissionError || !newSubmission) {
      setStatus(submissionError?.message ?? "Failed to create submission.");
      return;
    }

    const rows = selectedPlayers.map((player) => ({
      submission_id: newSubmission.id,
      player_name: player,
      points_awarded: calculatedPoints[player] ?? 0,
      contribution_percent: playerPercents[player] ?? 0,
    }));

    const { error: playersError } = await supabase
      .from("submission_players")
      .insert(rows);

    if (playersError) {
      setStatus(playersError.message);
      return;
    }

    router.push(`/team/${slug}`);
    router.refresh();
  };

  const handleUndo = async () => {
    if (!team || !submission) return;

    setStatus("Removing...");

    if (passcode !== team.passcode) {
      setStatus("Wrong team passcode.");
      return;
    }

    const { error } = await supabase
      .from("submissions")
      .update({ is_active: false })
      .eq("id", submission.id);

    if (error) {
      setStatus(error.message);
      return;
    }

    router.push(`/team/${slug}`);
    router.refresh();
  };

  if (loading) {
    return (
      <main className="min-h-screen">
        <div className="max-w-2xl mx-auto">
          <p>Loading tile...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{tile?.title ?? "Tile"}</h1>
          {tile?.show_clarification && tile?.description && (
  <div className="mt-4 rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4">
    <div className="text-sm font-bold text-yellow-300 mb-1">
      Tile Clarification
    </div>
    <div className="text-sm text-yellow-100 whitespace-pre-wrap">
      {tile.description}
    </div>
  </div>
)}
          {tile && (
            <p className="text-zinc-500 mt-2">MVP Points: {tile.mvp_points}</p>
          )}
        </div>

        <div>
          <label className="block mb-2">Team Passcode</label>
          <input
            className="w-full bg-zinc-900 border border-zinc-700 p-3 rounded"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
          />
        </div>

        {submission ? (
          <div className="space-y-6 rounded-xl border border-green-600 bg-green-950/30 p-5">
            <div>
              <h2 className="text-xl font-semibold">Completed</h2>
              {submission.created_at && (
                <p className="text-zinc-400 mt-1">
                  Submitted: {new Date(submission.created_at).toLocaleString()}
                </p>
              )}
            </div>

            <div>
              <div className="text-sm text-zinc-400 mb-1">Players</div>
              {submissionPlayers.length === 0 ? (
                <div className="text-zinc-300">No players listed.</div>
              ) : (
                <div className="space-y-2">
                  {submissionPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 p-3"
                    >
                      <span>
                        {player.player_name}
                        {player.contribution_percent !== null
                          ? ` (${player.contribution_percent}%)`
                          : ""}
                      </span>
                      <span className="text-zinc-400">
  {completedDisplayPoints[player.player_name] ?? player.points_awarded} pts
</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="text-sm text-zinc-400 mb-1">Proof Link</div>
              {submission.proof_url ? (
                <a
                  href={submission.proof_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 underline break-all"
                >
                  {submission.proof_url}
                </a>
              ) : (
                <div className="text-zinc-300">No proof link provided.</div>
              )}
            </div>

            <div>
              <div className="text-sm text-zinc-400 mb-1">Notes</div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-zinc-200">
                {submission.notes?.trim() ? submission.notes : "No notes."}
              </div>
            </div>

            <button
              onClick={handleUndo}
              className="bg-red-600 px-6 py-3 rounded font-bold"
            >
              Undo Completion
            </button>
          </div>
        ) : (
          <div className="space-y-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div>
              <h2 className="text-xl font-semibold">Submit Tile</h2>
            </div>

            <div>
              <label className="block mb-2">Players</label>
              {teamPlayers.length === 0 ? (
                <div className="text-zinc-400 text-sm">
                  No team roster found. Add players in Admin first.
                </div>
              ) : (
                <div className="space-y-3">
                  {teamPlayers.map((player) => {
                    const checked = selectedPlayers.includes(player.player_name);

                    return (
                      <div
                        key={player.id}
                        className={`rounded border p-3 ${
                          checked
                            ? "border-green-500 bg-green-950/30"
                            : "border-zinc-700 bg-zinc-950"
                        }`}
                      >
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePlayer(player.player_name)}
                          />
                          <span>{player.player_name}</span>
                        </label>

                        {checked && (
                          <div className="mt-3">
                            <label className="block mb-2 text-sm text-zinc-400">
                              Contribution %
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              className="w-full rounded border border-zinc-700 bg-zinc-900 p-3"
                              value={playerPercents[player.player_name] ?? 0}
                              onChange={(e) =>
                                updatePercent(player.player_name, e.target.value)
                              }
                            />
                            <div className="text-xs text-zinc-400 mt-2">
                              Calculated MVP:{" "}
                              {calculatedPoints[player.player_name] ?? 0}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <div className="text-sm text-zinc-400">Assigned Percentage</div>
              <div className="text-lg font-semibold">
                {percentTotal}% / 100%
              </div>
            </div>

            <div>
              <label className="block mb-2">Screenshot Link</label>
              <input
                className="w-full bg-zinc-950 border border-zinc-700 p-3 rounded"
                value={proof}
                onChange={(e) => setProof(e.target.value)}
                placeholder="https://imgur.com/..."
              />
            </div>

            <div>
              <label className="block mb-2">Optional Note</label>
              <textarea
                className="w-full bg-zinc-950 border border-zinc-700 p-3 rounded"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button
              onClick={handleSubmit}
              className="bg-green-600 px-6 py-3 rounded font-bold"
              disabled={teamPlayers.length === 0}
            >
              Submit Tile
            </button>
          </div>
        )}

        {status && <p>{status}</p>}
      </div>
    </main>
  );
}