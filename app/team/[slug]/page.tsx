import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import LiveRefresh from "../../../components/LiveRefresh";

type TeamPageProps = {
  params: Promise<{
    slug: string;
  }>;
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
        <LiveRefresh />
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold">Team not found</h1>
          <p className="text-red-400 mt-4">
            {teamError?.message ?? "No team found for this slug."}
          </p>
        </div>
      </main>
    );
  }

  const { data: tiles, error: tilesError } = await supabase
    .from("tiles")
    .select("id, row_index, col_index, title, description, image_url, mvp_points")
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

  const completedTileIds = new Set(submissions?.map((s) => s.tile_id) ?? []);
const completedCount = completedTileIds.size;

const boardRows = 6;
const boardCols = 6;

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

  for (let col = 0; col < boardCols; col++) {
    const colTiles = tiles?.filter((tile) => tile.col_index === col) ?? [];
    if (
      colTiles.length === boardRows &&
      colTiles.every((tile) => completedTileIds.has(tile.id))
    ) {
      bingoCount++;
    }
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
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

            <p className="text-zinc-400 mt-2">Team board</p>
          </div>

          <div className="flex gap-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-3">
              <div className="text-sm text-zinc-400">Tiles</div>
              <div className="text-2xl font-bold">{completedCount}</div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-3">
              <div className="text-sm text-zinc-400">Bingos</div>
              <div className="text-2xl font-bold">{bingoCount}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-3">
          {tiles?.map((tile) => {
            const isComplete = completedTileIds.has(tile.id);
const isBingoTile = bingoTileIds.has(tile.id);

return (
  <Link
    key={tile.id}
    href={`/team/${team.slug}/tile/${tile.id}`}
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
      className="w-24 h-24 object-contain mb-2"
    />
  )}

  <div className="text-sm font-semibold">{tile.title}</div>

  <div className="text-xs text-zinc-400 mt-2">
    MVP: {tile.mvp_points}
  </div>

  <div className="text-xs mt-2 font-medium">
  {isBingoTile ? "BINGO" : isComplete ? "Completed" : "Open"}
</div>
</Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}