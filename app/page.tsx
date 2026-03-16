import Link from "next/link";
import { supabase } from "../lib/supabase";
import LiveRefresh from "../components/LiveRefresh";
import HomeMvpPopover from "../components/HomeMvpPopover";

type TeamStanding = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  bingos: number;
  tiles: number;
};

type MvpStanding = {
  player_name: string;
  points: number;
  tiles: {
    tile_title: string;
    points_awarded: number;
    team_name: string;
  }[];
};

function getTeamRankClasses(index: number) {
  if (index === 0) return "bg-yellow-500/15 border-yellow-400/40";
  if (index === 1) return "bg-zinc-300/10 border-zinc-300/30";
  if (index === 2) return "bg-amber-700/15 border-amber-600/40";
  return "";
}

function getTeamRankBadge(index: number) {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return null;
}

export default async function Home() {
  const { data: activeEvent, error: eventError } = await supabase
    .from("events")
    .select("id, name, board_rows, board_cols")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (eventError || !activeEvent) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold">Error loading event</h1>
          <p className="text-red-400 mt-4">
            {eventError?.message ?? "No active event found."}
          </p>
        </div>
      </main>
    );
  }

  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, name, slug, display_order, event_id, logo_url")
    .eq("event_id", activeEvent.id)
    .order("display_order", { ascending: true });

  if (teamsError || !teams) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold">Error loading teams</h1>
          <p className="text-red-400 mt-4">
            {teamsError?.message ?? "No teams found."}
          </p>
        </div>
      </main>
    );
  }

  const { data: tiles, error: tilesError } = await supabase
    .from("tiles")
    .select("id, event_id, row_index, col_index, title")
    .eq("event_id", activeEvent.id)
    .order("row_index", { ascending: true })
    .order("col_index", { ascending: true });

  if (tilesError || !tiles) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold">Error loading tiles</h1>
          <p className="text-red-400 mt-4">
            {tilesError?.message ?? "No tiles found."}
          </p>
        </div>
      </main>
    );
  }

  const { data: submissions, error: submissionsError } = await supabase
    .from("submissions")
    .select("id, team_id, tile_id, created_at, proof_url, notes")
    .eq("is_active", true)
    .eq("event_id", activeEvent.id);

  if (submissionsError || !submissions) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold">Error loading submissions</h1>
          <p className="text-red-400 mt-4">
            {submissionsError?.message ?? "No submissions found."}
          </p>
        </div>
      </main>
    );
  }

  const submissionIds = submissions.map((submission) => submission.id);

  const { data: submissionPlayers, error: submissionPlayersError } =
    submissionIds.length > 0
      ? await supabase
          .from("submission_players")
          .select("submission_id, player_name, points_awarded")
          .in("submission_id", submissionIds)
      : { data: [], error: null };

  if (submissionPlayersError || !submissionPlayers) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold">Error loading MVP data</h1>
          <p className="text-red-400 mt-4">
            {submissionPlayersError?.message ?? "No MVP data found."}
          </p>
        </div>
      </main>
    );
  }

  const standings: TeamStanding[] = teams.map((team) => {
    const teamTiles = tiles.filter((tile) => tile.event_id === team.event_id);
    const teamSubmissions = submissions.filter(
      (submission) => submission.team_id === team.id
    );

    const completedTileIds = new Set(teamSubmissions.map((s) => s.tile_id));
    const completedCount = completedTileIds.size;

    const maxRow =
      teamTiles.length > 0 ? Math.max(...teamTiles.map((t) => t.row_index)) : -1;
    const maxCol =
      teamTiles.length > 0 ? Math.max(...teamTiles.map((t) => t.col_index)) : -1;

    let bingoCount = 0;

    for (let row = 0; row <= maxRow; row++) {
      const rowTiles = teamTiles.filter((tile) => tile.row_index === row);
      if (
        rowTiles.length === maxCol + 1 &&
        rowTiles.every((tile) => completedTileIds.has(tile.id))
      ) {
        bingoCount++;
      }
    }

    for (let col = 0; col <= maxCol; col++) {
      const colTiles = teamTiles.filter((tile) => tile.col_index === col);
      if (
        colTiles.length === maxRow + 1 &&
        colTiles.every((tile) => completedTileIds.has(tile.id))
      ) {
        bingoCount++;
      }
    }

    return {
      id: team.id,
      name: team.name,
      slug: team.slug,
      logo_url: team.logo_url,
      bingos: bingoCount,
      tiles: completedCount,
    };
  });

  standings.sort((a, b) => {
    if (b.bingos !== a.bingos) return b.bingos - a.bingos;
    if (b.tiles !== a.tiles) return b.tiles - a.tiles;
    return a.name.localeCompare(b.name);
  });

  const teamsAlphabetical = [...standings].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const submissionMap = new Map(
    submissions.map((submission) => [submission.id, submission])
  );
  const tileMap = new Map(tiles.map((tile) => [tile.id, tile]));
  const teamMap = new Map(teams.map((team) => [team.id, team]));

  const mvpAggregate = new Map<string, MvpAggregateEntry>();

  type MvpTileBreakdown = {
  tile_title: string;
  points_awarded: number;
  team_name: string;
};

type MvpAggregateEntry = {
  player_name: string;
  points: number;
  tiles: MvpTileBreakdown[];
};

  for (const row of submissionPlayers) {
    const current: MvpAggregateEntry = mvpAggregate.get(row.player_name) ?? {
  player_name: row.player_name,
  points: 0,
  tiles: [],
};

    const submission = submissionMap.get(row.submission_id);
    const tile = submission ? tileMap.get(submission.tile_id) : null;
    const team = submission ? teamMap.get(submission.team_id) : null;

    current.points += row.points_awarded;
    current.tiles.push({
      tile_title: tile?.title ?? "Unknown Tile",
      points_awarded: row.points_awarded,
      team_name: team?.name ?? "Unknown Team",
    });

    mvpAggregate.set(row.player_name, current);
  }

  const mvpStandings: MvpStanding[] = Array.from(mvpAggregate.values()).sort(
    (a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.player_name.localeCompare(b.player_name);
    }
  );

  const latestSubmission =
    submissions.length > 0
      ? [...submissions].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0]
      : null;

  const latestTeam = latestSubmission
    ? teams.find((team) => team.id === latestSubmission.team_id)
    : null;

  const latestTile = latestSubmission
    ? tiles.find((tile) => tile.id === latestSubmission.tile_id)
    : null;

  const latestPlayers = latestSubmission
    ? submissionPlayers.filter(
        (player) => player.submission_id === latestSubmission.id
      )
    : [];

  return (
    <main className="min-h-screen">
      <LiveRefresh />

      <div className="mx-auto max-w-6xl">
        <h1 className="text-4xl font-bold mb-2">{activeEvent.name}</h1>
        <p className="text-zinc-400 mb-8">
          Leaderboard, team boards, MVP standings, and event progress.
        </p>

        <div className="grid gap-8 xl:grid-cols-[2fr_1fr]">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Leaderboard</h2>
            <div className="overflow-hidden rounded-xl border border-zinc-800">
              <table className="w-full text-left">
                <thead className="bg-zinc-900">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Team</th>
                    <th className="p-3">Bingos</th>
                    <th className="p-3">Tiles</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((team, index) => {
                    const badge = getTeamRankBadge(index);

                    return (
                      <tr
                        key={team.id}
                        className={`border-t border-zinc-800 ${getTeamRankClasses(index)}`}
                      >
                        <td className="p-3 font-semibold">
                          <div className="flex items-center gap-2">
                            {badge && <span>{badge}</span>}
                            <span>{index + 1}</span>
                          </div>
                        </td>

                        <td className="p-3 font-semibold">
                          <Link
                            href={`/team/${team.slug}`}
                            className="flex items-center gap-3 hover:underline"
                          >
                            {team.logo_url && (
                              <img
                                src={team.logo_url}
                                alt={team.name}
                                className="w-7 h-7 rounded object-contain"
                              />
                            )}
                            {team.name}
                          </Link>
                        </td>

                        <td className="p-3">{team.bingos}</td>
                        <td className="p-3">{team.tiles}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-1">MVP Leaderboard</h2>
            <p className="text-xs text-zinc-400 mb-4">Top 5 players</p>

            <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
              <HomeMvpPopover players={mvpStandings} />
            </div>
          </section>
        </div>

        <section className="mt-10">
          <h2 className="text-2xl font-semibold mb-4">
            🔥 Latest Tile Completion
          </h2>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            {!latestSubmission || !latestTeam || !latestTile ? (
              <p className="text-zinc-400">No tile completions yet.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {latestTeam.logo_url && (
                    <img
                      src={latestTeam.logo_url}
                      alt={latestTeam.name}
                      className="w-10 h-10 rounded object-contain"
                    />
                  )}

                  <div>
                    <div className="text-lg font-semibold">
                      {latestTeam.name} completed {latestTile.title}
                    </div>
                    <div className="text-sm text-zinc-400">
                      {new Date(latestSubmission.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="text-sm text-zinc-300">
                  <span className="text-zinc-400">Players:</span>{" "}
                  {latestPlayers.length > 0
                    ? latestPlayers.map((p) => p.player_name).join(", ")
                    : "No players listed"}
                </div>

                {latestSubmission.proof_url && (
                  <div className="text-sm">
                    <span className="text-zinc-400">Proof:</span>{" "}
                    <a
                      href={latestSubmission.proof_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 underline break-all"
                    >
                      {latestSubmission.proof_url}
                    </a>
                  </div>
                )}

                <div>
                  <Link
                    href={`/team/${latestTeam.slug}/tile/${latestTile.id}`}
                    className="inline-block rounded bg-zinc-800 px-4 py-2 text-sm font-semibold hover:bg-zinc-700"
                  >
                    View Tile Details
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-semibold mb-4">Teams</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {teamsAlphabetical.map((team) => (
              <Link
                key={team.id}
                href={`/team/${team.slug}`}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 hover:bg-zinc-800 hover:scale-[1.02] transition"
              >
                <div className="flex items-center gap-3">
                  {team.logo_url && (
                    <img
                      src={team.logo_url}
                      alt={team.name}
                      className="w-8 h-8 rounded object-contain"
                    />
                  )}

                  <span className="text-xl font-semibold">{team.name}</span>
                </div>

                <div className="text-zinc-400 mt-1">
                  {team.bingos} bingos • {team.tiles} tiles
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}