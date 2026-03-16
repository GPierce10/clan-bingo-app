import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import LiveRefresh from "../../../components/LiveRefresh";
import TeamRosterPopover from "../../../components/TeamRosterPopover";

type TeamPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type TeamPlayer = {
  id: string;
  player_name: string;
  display_order: number;
};

type SubmissionPlayer = {
  submission_id: string;
  player_name: string;
  points_awarded: number;
};

export default async function TeamPage({ params }: TeamPageProps) {
  const { slug } = await params;

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, name, slug, event_id, logo_url")
    .eq("slug", slug)
    .single();

  if (teamError || !team) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold">Team not found</h1>
          <p className="text-red-400 mt-4">
            {teamError?.message ?? "No team found for this slug."}
          </p>
        </div>
      </main>
    );
  }

  const { data: eventRecord, error: eventError } = await supabase
    .from("events")
    .select("id, board_rows, board_cols")
    .eq("id", team.event_id)
    .single();

  if (eventError || !eventRecord) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold">Event not found</h1>
          <p className="text-red-400 mt-4">
            {eventError?.message ?? "No event found for this team."}
          </p>
        </div>
      </main>
    );
  }

  const { data: roster, error: rosterError } = await supabase
    .from("team_players")
    .select("id, player_name, display_order")
    .eq("team_id", team.id)
    .order("display_order", { ascending: true })
    .order("player_name", { ascending: true });

  if (rosterError) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold">Error loading roster</h1>
          <p className="text-red-400 mt-4">{rosterError.message}</p>
        </div>
      </main>
    );
  }

  const { data: tiles, error: tilesError } = await supabase
    .from("tiles")
    .select(
      "id, row_index, col_index, title, description, image_url, mvp_points, show_clarification"
    )
    .eq("event_id", team.event_id)
    .order("row_index", { ascending: true })
    .order("col_index", { ascending: true });

  if (tilesError) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold">Error loading tiles</h1>
          <p className="text-red-400 mt-4">{tilesError.message}</p>
        </div>
      </main>
    );
  }

  const { data: submissions, error: submissionsError } = await supabase
    .from("submissions")
    .select("id, tile_id, proof_url, notes")
    .eq("team_id", team.id)
    .eq("is_active", true);

  if (submissionsError) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold">Error loading submissions</h1>
          <p className="text-red-400 mt-4">{submissionsError.message}</p>
        </div>
      </main>
    );
  }

  const submissionIds = (submissions ?? []).map((submission) => submission.id);

  const { data: submissionPlayers, error: submissionPlayersError } =
    submissionIds.length > 0
      ? await supabase
          .from("submission_players")
          .select("submission_id, player_name, points_awarded")
          .in("submission_id", submissionIds)
      : { data: [], error: null };

  if (submissionPlayersError) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold">Error loading MVP data</h1>
          <p className="text-red-400 mt-4">{submissionPlayersError.message}</p>
        </div>
      </main>
    );
  }

  const completedTileIds = new Set((submissions ?? []).map((s) => s.tile_id));
  const completedCount = completedTileIds.size;

  const boardRows = eventRecord.board_rows;
  const boardCols = eventRecord.board_cols;

  let bingoCount = 0;
  const bingoTileIds = new Set<string>();

  for (let row = 0; row < boardRows; row++) {
    const rowTiles = tiles?.filter((tile) => tile.row_index === row) ?? [];
    if (
      rowTiles.length === boardCols &&
      rowTiles.every((tile) => completedTileIds.has(tile.id))
    ) {
      bingoCount++;
      rowTiles.forEach((tile) => bingoTileIds.add(tile.id));
    }
  }

  for (let col = 0; col < boardCols; col++) {
    const colTiles = tiles?.filter((tile) => tile.col_index === col) ?? [];
    if (
      colTiles.length === boardRows &&
      colTiles.every((tile) => completedTileIds.has(tile.id))
    ) {
      bingoCount++;
      colTiles.forEach((tile) => bingoTileIds.add(tile.id));
    }
  }

  const teamMvpMap = new Map<string, number>();

  for (const row of submissionPlayers ?? []) {
    const current = teamMvpMap.get(row.player_name) ?? 0;
    teamMvpMap.set(row.player_name, current + row.points_awarded);
  }

  const teamMvpStandings = Array.from(teamMvpMap.entries())
    .map(([player_name, points]) => ({ player_name, points }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.player_name.localeCompare(b.player_name);
    });

  const topPoints = teamMvpStandings[0]?.points ?? 0;
  const topPlayers =
    topPoints > 0
      ? teamMvpStandings
          .filter((player) => player.points === topPoints)
          .map((player) => player.player_name)
      : [];

  const teamMvpLabel =
    topPlayers.length === 0
      ? "No points yet"
      : topPlayers.length === 1
      ? topPlayers[0]
      : topPlayers.join(", ");

  const submissionTileMap = new Map(
    (submissions ?? []).map((submission) => [submission.id, submission.tile_id])
  );

  const tileTitleMap = new Map((tiles ?? []).map((tile) => [tile.id, tile.title]));

  const rosterBreakdown = (roster ?? []).map((player: TeamPlayer) => {
    const playerRows = (submissionPlayers ?? []).filter(
      (row) => row.player_name === player.player_name
    );

    const total_points = playerRows.reduce(
      (sum, row) => sum + row.points_awarded,
      0
    );

    const tilesForPlayer = playerRows.map((row) => {
      const tileId = submissionTileMap.get(row.submission_id);
      const tileTitle = tileId
        ? tileTitleMap.get(tileId) ?? "Unknown Tile"
        : "Unknown Tile";

      return {
        tile_title: tileTitle,
        points_awarded: row.points_awarded,
      };
    });

    return {
      player_name: player.player_name,
      total_points,
      tiles: tilesForPlayer,
    };
  });

  return (
    <main className="min-h-screen">
      <LiveRefresh />

      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-4 mb-2">
              {team.logo_url && (
                <img
                  src={team.logo_url}
                  alt={team.name}
                  className="w-12 h-12 rounded object-contain"
                />
              )}

              <h1 className="text-4xl font-bold">{team.name}</h1>
            </div>

            <div className="mt-3">
              <div className="text-sm text-zinc-400 mb-2">Roster</div>

              {roster && roster.length > 0 ? (
                <TeamRosterPopover players={rosterBreakdown} />
              ) : (
                <div className="text-sm text-zinc-500">No roster added yet.</div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 xl:justify-end">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-3 min-w-[120px]">
              <div className="text-sm text-zinc-400">Tiles</div>
              <div className="text-2xl font-bold">{completedCount}</div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-3 min-w-[120px]">
              <div className="text-sm text-zinc-400">Bingos</div>
              <div className="text-2xl font-bold">{bingoCount}</div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-3 min-w-[180px]">
              <div className="text-sm text-zinc-400">Team MVP</div>
              <div className="text-base font-bold truncate">{teamMvpLabel}</div>
              <div className="text-sm text-zinc-400">
                {topPoints > 0 ? `${topPoints} pts` : ""}
              </div>
            </div>
          </div>
        </div>

        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${boardCols}, minmax(0, 1fr))`,
          }}
        >
          {tiles?.map((tile) => {
            const isComplete = completedTileIds.has(tile.id);
            const isBingoTile = bingoTileIds.has(tile.id);

            return (
              <Link
                key={tile.id}
                href={`/team/${team.slug}/tile/${tile.id}`}
                title={
                  tile.show_clarification && tile.description
                    ? tile.description
                    : tile.title
                }
                className={`aspect-square rounded-lg border p-3 flex flex-col items-center justify-center text-center transition ${
                  isBingoTile
                    ? "bg-green-900 border-yellow-400 ring-2 ring-yellow-400/70 shadow-[0_0_20px_rgba(250,204,21,0.25)] hover:bg-green-800"
                    : isComplete
                    ? "bg-green-900 border-green-500 hover:bg-green-800"
                    : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800"
                }`}
              >
                {tile.image_url && (
                  <img
                    src={tile.image_url}
                    alt={tile.title}
                    className="w-12 h-12 object-contain mb-2"
                  />
                )}

                <div className="text-sm font-semibold">{tile.title}</div>

                <div className="text-xs text-zinc-400 mt-2">
                  MVP: {tile.mvp_points}
                </div>

                <div className="text-xs mt-2 font-medium">
                  {isComplete ? "Completed" : "Open"}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}