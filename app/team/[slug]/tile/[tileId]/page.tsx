"use client";

import { use, useEffect, useState } from "react";
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
};

type TeamPlayerRecord = {
  id: string;
  player_name: string;
  display_order: number;
};

export default function TilePage({ params }: any) {
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
        .select("id, title, description, image_url, mvp_points")
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
          .select("id, player_name, points_awarded")
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
    setSelectedPlayers((current) =>
      current.includes(playerName)
        ? current.filter((p) => p !== playerName)
        : [...current, playerName]
    );
  };

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

    const splitPoints = Math.ceil(tile.mvp_points / selectedPlayers.length);

const rows = selectedPlayers.map((player) => ({
  submission_id: newSubmission.id,
  player_name: player,
  points_awarded: splitPoints,
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
          {tile?.description && (
            <p className="text-zinc-400 mt-2">{tile.description}</p>
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
                      <span>{player.player_name}</span>
                      <span className="text-zinc-400">
                        {player.points_awarded} pts
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
                <div className="grid gap-2 sm:grid-cols-2">
                  {teamPlayers.map((player) => {
                    const checked = selectedPlayers.includes(player.player_name);

                    return (
                      <label
                        key={player.id}
                        className={`flex items-center gap-3 rounded border p-3 cursor-pointer ${
                          checked
                            ? "border-green-500 bg-green-950/30"
                            : "border-zinc-700 bg-zinc-950"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePlayer(player.player_name)}
                        />
                        <span>{player.player_name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
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