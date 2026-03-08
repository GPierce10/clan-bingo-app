"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type EventRecord = {
  id: string;
  name: string;
  board_rows: number;
  board_cols: number;
  is_active: boolean;
};

type TileRecord = {
  id: string;
  event_id: string;
  row_index: number;
  col_index: number;
  title: string;
  description: string | null;
  image_url: string | null;
  mvp_points: number;
};

type TeamRecord = {
  id: string;
  event_id: string;
  name: string;
  slug: string;
  passcode: string;
  display_order: number;
  logo_url: string | null;
};

type TeamPlayerRecord = {
  id: string;
  team_id: string;
  player_name: string;
  display_order: number;
};

type NewTileForm = {
  row_index: string;
  col_index: string;
  title: string;
  description: string;
  image_url: string;
  mvp_points: string;
};

type NewRosterPlayerForm = {
  [teamId: string]: {
    player_name: string;
    display_order: string;
  };
};

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [eventRecord, setEventRecord] = useState<EventRecord | null>(null);
  const [tiles, setTiles] = useState<TileRecord[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [teamPlayers, setTeamPlayers] = useState<TeamPlayerRecord[]>([]);

  const [eventName, setEventName] = useState("");
  const [boardRows, setBoardRows] = useState("6");
  const [boardCols, setBoardCols] = useState("6");

  const [newTile, setNewTile] = useState<NewTileForm>({
    row_index: "",
    col_index: "",
    title: "",
    description: "",
    image_url: "",
    mvp_points: "1",
  });

  const [newRosterPlayers, setNewRosterPlayers] = useState<NewRosterPlayerForm>(
    {}
  );

  const sortedTiles = useMemo(() => {
    return [...tiles].sort((a, b) => {
      if (a.row_index !== b.row_index) return a.row_index - b.row_index;
      return a.col_index - b.col_index;
    });
  }, [tiles]);

  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => {
      if (a.display_order !== b.display_order) {
        return a.display_order - b.display_order;
      }
      return a.name.localeCompare(b.name);
    });
  }, [teams]);

  const getRosterForTeam = (teamId: string) => {
    return [...teamPlayers]
      .filter((player) => player.team_id === teamId)
      .sort((a, b) => {
        if (a.display_order !== b.display_order) {
          return a.display_order - b.display_order;
        }
        return a.player_name.localeCompare(b.player_name);
      });
  };

  const loadData = async () => {
    setLoading(true);
    setStatus("");

    const { data: activeEvent, error: eventError } = await supabase
      .from("events")
      .select("id, name, board_rows, board_cols, is_active")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (eventError || !activeEvent) {
      setStatus(eventError?.message ?? "No active event found.");
      setLoading(false);
      return;
    }

    setEventRecord(activeEvent);
    setEventName(activeEvent.name);
    setBoardRows(String(activeEvent.board_rows));
    setBoardCols(String(activeEvent.board_cols));

    const { data: tileRows, error: tilesError } = await supabase
      .from("tiles")
      .select(
        "id, event_id, row_index, col_index, title, description, image_url, mvp_points"
      )
      .eq("event_id", activeEvent.id);

    if (tilesError) {
      setStatus(tilesError.message);
      setLoading(false);
      return;
    }

    const { data: teamRows, error: teamsError } = await supabase
      .from("teams")
      .select(
        "id, event_id, name, slug, passcode, display_order, logo_url"
      )
      .eq("event_id", activeEvent.id);

    if (teamsError) {
      setStatus(teamsError.message);
      setLoading(false);
      return;
    }

    const teamIds = (teamRows ?? []).map((team) => team.id);

    const { data: rosterRows, error: rosterError } =
      teamIds.length > 0
        ? await supabase
            .from("team_players")
            .select("id, team_id, player_name, display_order")
            .in("team_id", teamIds)
        : { data: [], error: null };

    if (rosterError) {
      setStatus(rosterError.message);
      setLoading(false);
      return;
    }

    setTiles(tileRows ?? []);
    setTeams(teamRows ?? []);
    setTeamPlayers(rosterRows ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveEventSettings = async () => {
    if (!eventRecord) return;

    setStatus("Saving event settings...");

    const parsedRows = Number(boardRows);
    const parsedCols = Number(boardCols);

    if (!Number.isInteger(parsedRows) || parsedRows < 1) {
      setStatus("Board rows must be a whole number.");
      return;
    }

    if (!Number.isInteger(parsedCols) || parsedCols < 1) {
      setStatus("Board cols must be a whole number.");
      return;
    }

    const { data, error } = await supabase
      .from("events")
      .update({
        name: eventName,
        board_rows: parsedRows,
        board_cols: parsedCols,
      })
      .eq("id", eventRecord.id)
      .select("id, name, board_rows, board_cols, is_active")
      .single();

    if (error || !data) {
      setStatus(error?.message ?? "Failed to save event settings.");
      return;
    }

    setEventRecord(data);
    setStatus("Event settings saved.");
  };

  const updateTileField = (
    tileId: string,
    field: keyof TileRecord,
    value: string | number | null
  ) => {
    setTiles((current) =>
      current.map((tile) =>
        tile.id === tileId ? { ...tile, [field]: value } : tile
      )
    );
  };

  const saveTile = async (tile: TileRecord) => {
    setStatus(`Saving ${tile.title || "tile"}...`);

    const { error } = await supabase
      .from("tiles")
      .update({
        row_index: Number(tile.row_index),
        col_index: Number(tile.col_index),
        title: tile.title,
        description: tile.description,
        image_url: tile.image_url,
        mvp_points: Number(tile.mvp_points),
      })
      .eq("id", tile.id);

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus(`Saved "${tile.title}".`);
    await loadData();
  };

  const deleteTile = async (tileId: string) => {
    setStatus("Deleting tile...");

    const { error } = await supabase.from("tiles").delete().eq("id", tileId);

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("Tile deleted.");
    await loadData();
  };

  const addTile = async () => {
    if (!eventRecord) return;

    setStatus("Adding tile...");

    const parsedRow = Number(newTile.row_index);
    const parsedCol = Number(newTile.col_index);
    const parsedMvp = Number(newTile.mvp_points);

    if (!Number.isInteger(parsedRow) || parsedRow < 0) {
      setStatus("New tile row must be 0 or higher.");
      return;
    }

    if (!Number.isInteger(parsedCol) || parsedCol < 0) {
      setStatus("New tile col must be 0 or higher.");
      return;
    }

    if (!newTile.title.trim()) {
      setStatus("New tile title is required.");
      return;
    }

    if (!Number.isInteger(parsedMvp) || parsedMvp < 0) {
      setStatus("MVP points must be 0 or higher.");
      return;
    }

    const duplicate = tiles.find(
      (tile) => tile.row_index === parsedRow && tile.col_index === parsedCol
    );

    if (duplicate) {
      setStatus("A tile already exists at that row/col.");
      return;
    }

    const { error } = await supabase.from("tiles").insert({
      event_id: eventRecord.id,
      row_index: parsedRow,
      col_index: parsedCol,
      title: newTile.title.trim(),
      description: newTile.description.trim() || null,
      image_url: newTile.image_url.trim() || null,
      mvp_points: parsedMvp,
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    setNewTile({
      row_index: "",
      col_index: "",
      title: "",
      description: "",
      image_url: "",
      mvp_points: "1",
    });

    setStatus("Tile added.");
    await loadData();
  };

  const updateTeamField = (
    teamId: string,
    field: keyof TeamRecord,
    value: string | number | null
  ) => {
    setTeams((current) =>
      current.map((team) =>
        team.id === teamId ? { ...team, [field]: value } : team
      )
    );
  };

  const saveTeam = async (team: TeamRecord) => {
    setStatus(`Saving ${team.name || "team"}...`);

    const { error } = await supabase
      .from("teams")
      .update({
        name: team.name,
        slug: team.slug,
        passcode: team.passcode,
        display_order: Number(team.display_order),
        logo_url: team.logo_url,
      })
      .eq("id", team.id);

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus(`Saved "${team.name}".`);
    await loadData();
  };

  const updateRosterField = (
    playerId: string,
    field: keyof TeamPlayerRecord,
    value: string | number
  ) => {
    setTeamPlayers((current) =>
      current.map((player) =>
        player.id === playerId ? { ...player, [field]: value } : player
      )
    );
  };

  const saveRosterPlayer = async (player: TeamPlayerRecord) => {
    setStatus(`Saving ${player.player_name}...`);

    const { error } = await supabase
      .from("team_players")
      .update({
        player_name: player.player_name,
        display_order: Number(player.display_order),
      })
      .eq("id", player.id);

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus(`Saved "${player.player_name}".`);
    await loadData();
  };

  const deleteRosterPlayer = async (playerId: string) => {
    setStatus("Deleting roster player...");

    const { error } = await supabase
      .from("team_players")
      .delete()
      .eq("id", playerId);

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("Roster player deleted.");
    await loadData();
  };

  const addRosterPlayer = async (teamId: string) => {
    const form = newRosterPlayers[teamId] ?? {
      player_name: "",
      display_order: "",
    };

    const playerName = form.player_name.trim();
    const displayOrder = Number(form.display_order || "0");

    if (!playerName) {
      setStatus("Roster player name is required.");
      return;
    }

    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      setStatus("Roster display order must be 0 or higher.");
      return;
    }

    setStatus("Adding roster player...");

    const { error } = await supabase.from("team_players").insert({
      team_id: teamId,
      player_name: playerName,
      display_order: displayOrder,
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    setNewRosterPlayers((current) => ({
      ...current,
      [teamId]: {
        player_name: "",
        display_order: "",
      },
    }));

    setStatus("Roster player added.");
    await loadData();
  };

  const recalculateMvp = async () => {
    if (!eventRecord) return;

    setStatus("Recalculating MVP points...");

    const { data: submissions, error: submissionsError } = await supabase
      .from("submissions")
      .select("id, tile_id")
      .eq("event_id", eventRecord.id)
      .eq("is_active", true);

    if (submissionsError) {
      setStatus(submissionsError.message);
      return;
    }

    const { data: tileRows, error: tileError } = await supabase
      .from("tiles")
      .select("id, mvp_points")
      .eq("event_id", eventRecord.id);

    if (tileError) {
      setStatus(tileError.message);
      return;
    }

    const tilePointsMap = new Map(
      (tileRows ?? []).map((tile) => [tile.id, tile.mvp_points])
    );

    for (const submission of submissions ?? []) {
      const tilePoints = tilePointsMap.get(submission.tile_id) ?? 0;

      const { data: playersForSubmission, error: playersError } = await supabase
        .from("submission_players")
        .select("id")
        .eq("submission_id", submission.id);

      if (playersError) {
        setStatus(playersError.message);
        return;
      }

      const playerCount = playersForSubmission?.length ?? 0;
      const splitPoints =
        playerCount > 0 ? Math.ceil(tilePoints / playerCount) : 0;

      const { error: updateError } = await supabase
        .from("submission_players")
        .update({ points_awarded: splitPoints })
        .eq("submission_id", submission.id);

      if (updateError) {
        setStatus(updateError.message);
        return;
      }
    }

    setStatus("MVP points recalculated from current tile values.");
  };

  if (loading) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold">Admin</h1>
          <p className="text-zinc-400 mt-3">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Admin</h1>
          <p className="text-zinc-400 mt-2">
            Edit event settings, teams, rosters, tiles, and MVP values.
          </p>
          {status && <p className="mt-3 text-sm text-zinc-300">{status}</p>}
        </div>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Event Settings</h2>
              <p className="text-zinc-400 text-sm">
                Update the active event name and board dimensions.
              </p>
            </div>

            <button
              onClick={recalculateMvp}
              className="rounded bg-purple-600 px-5 py-3 font-semibold hover:bg-purple-500"
            >
              Recalculate MVP Points
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mt-5">
            <div>
              <label className="block mb-2 text-sm text-zinc-400">
                Event Name
              </label>
              <input
                className="w-full rounded border border-zinc-700 bg-zinc-950 p-3"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
              />
            </div>

            <div>
              <label className="block mb-2 text-sm text-zinc-400">
                Board Rows
              </label>
              <input
                className="w-full rounded border border-zinc-700 bg-zinc-950 p-3"
                value={boardRows}
                onChange={(e) => setBoardRows(e.target.value)}
              />
            </div>

            <div>
              <label className="block mb-2 text-sm text-zinc-400">
                Board Cols
              </label>
              <input
                className="w-full rounded border border-zinc-700 bg-zinc-950 p-3"
                value={boardCols}
                onChange={(e) => setBoardCols(e.target.value)}
              />
            </div>
          </div>

          <button
            onClick={saveEventSettings}
            className="mt-5 rounded bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500"
          >
            Save Event Settings
          </button>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-semibold">Teams & Rosters</h2>
            <div className="text-sm text-zinc-400">
              {sortedTeams.length} team{sortedTeams.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="space-y-6">
            {sortedTeams.map((team) => {
              const roster = getRosterForTeam(team.id);
              const newRosterForm = newRosterPlayers[team.id] ?? {
                player_name: "",
                display_order: "",
              };

              return (
                <div
                  key={team.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                >
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <label className="block mb-2 text-sm text-zinc-400">
                        Team Name
                      </label>
                      <input
                        className="w-full rounded border border-zinc-700 bg-zinc-900 p-3"
                        value={team.name}
                        onChange={(e) =>
                          updateTeamField(team.id, "name", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label className="block mb-2 text-sm text-zinc-400">
                        Slug
                      </label>
                      <input
                        className="w-full rounded border border-zinc-700 bg-zinc-900 p-3"
                        value={team.slug}
                        onChange={(e) =>
                          updateTeamField(team.id, "slug", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label className="block mb-2 text-sm text-zinc-400">
                        Passcode
                      </label>
                      <input
                        className="w-full rounded border border-zinc-700 bg-zinc-900 p-3"
                        value={team.passcode}
                        onChange={(e) =>
                          updateTeamField(team.id, "passcode", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label className="block mb-2 text-sm text-zinc-400">
                        Display Order
                      </label>
                      <input
                        className="w-full rounded border border-zinc-700 bg-zinc-900 p-3"
                        value={team.display_order}
                        onChange={(e) =>
                          updateTeamField(
                            team.id,
                            "display_order",
                            Number(e.target.value)
                          )
                        }
                      />
                    </div>

                    <div className="md:col-span-2 xl:col-span-4">
                      <label className="block mb-2 text-sm text-zinc-400">
                        Logo URL
                      </label>
                      <input
                        className="w-full rounded border border-zinc-700 bg-zinc-900 p-3"
                        value={team.logo_url ?? ""}
                        onChange={(e) =>
                          updateTeamField(team.id, "logo_url", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={() => saveTeam(team)}
                      className="rounded bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-500"
                    >
                      Save Team
                    </button>
                  </div>

                  <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold">Roster</h3>
                      <div className="text-sm text-zinc-400">
                        {roster.length} player{roster.length === 1 ? "" : "s"}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {roster.map((player) => (
                        <div
                          key={player.id}
                          className="grid gap-3 md:grid-cols-[1fr_140px_auto] items-end rounded border border-zinc-800 bg-zinc-950 p-3"
                        >
                          <div>
                            <label className="block mb-2 text-sm text-zinc-400">
                              Player Name
                            </label>
                            <input
                              className="w-full rounded border border-zinc-700 bg-zinc-900 p-3"
                              value={player.player_name}
                              onChange={(e) =>
                                updateRosterField(
                                  player.id,
                                  "player_name",
                                  e.target.value
                                )
                              }
                            />
                          </div>

                          <div>
                            <label className="block mb-2 text-sm text-zinc-400">
                              Display Order
                            </label>
                            <input
                              className="w-full rounded border border-zinc-700 bg-zinc-900 p-3"
                              value={player.display_order}
                              onChange={(e) =>
                                updateRosterField(
                                  player.id,
                                  "display_order",
                                  Number(e.target.value)
                                )
                              }
                            />
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => saveRosterPlayer(player)}
                              className="rounded bg-blue-600 px-4 py-3 font-semibold hover:bg-blue-500"
                            >
                              Save
                            </button>

                            <button
                              onClick={() => deleteRosterPlayer(player.id)}
                              className="rounded bg-red-600 px-4 py-3 font-semibold hover:bg-red-500"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 rounded border border-zinc-800 bg-zinc-950 p-4">
                      <h4 className="text-lg font-semibold mb-3">
                        Add Roster Player
                      </h4>

                      <div className="grid gap-3 md:grid-cols-[1fr_140px_auto] items-end">
                        <div>
                          <label className="block mb-2 text-sm text-zinc-400">
                            Player Name
                          </label>
                          <input
                            className="w-full rounded border border-zinc-700 bg-zinc-900 p-3"
                            value={newRosterForm.player_name}
                            onChange={(e) =>
                              setNewRosterPlayers((current) => ({
                                ...current,
                                [team.id]: {
                                  ...current[team.id],
                                  player_name: e.target.value,
                                  display_order:
                                    current[team.id]?.display_order ?? "",
                                },
                              }))
                            }
                          />
                        </div>

                        <div>
                          <label className="block mb-2 text-sm text-zinc-400">
                            Display Order
                          </label>
                          <input
                            className="w-full rounded border border-zinc-700 bg-zinc-900 p-3"
                            value={newRosterForm.display_order}
                            onChange={(e) =>
                              setNewRosterPlayers((current) => ({
                                ...current,
                                [team.id]: {
                                  player_name:
                                    current[team.id]?.player_name ?? "",
                                  display_order: e.target.value,
                                },
                              }))
                            }
                            placeholder="0"
                          />
                        </div>

                        <button
                          onClick={() => addRosterPlayer(team.id)}
                          className="rounded bg-green-600 px-4 py-3 font-semibold hover:bg-green-500"
                        >
                          Add Player
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-2xl font-semibold mb-5">Add Tile</h2>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="block mb-2 text-sm text-zinc-400">Row</label>
              <input
                className="w-full rounded border border-zinc-700 bg-zinc-950 p-3"
                value={newTile.row_index}
                onChange={(e) =>
                  setNewTile((current) => ({
                    ...current,
                    row_index: e.target.value,
                  }))
                }
                placeholder="0"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm text-zinc-400">Col</label>
              <input
                className="w-full rounded border border-zinc-700 bg-zinc-950 p-3"
                value={newTile.col_index}
                onChange={(e) =>
                  setNewTile((current) => ({
                    ...current,
                    col_index: e.target.value,
                  }))
                }
                placeholder="0"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm text-zinc-400">
                MVP Points
              </label>
              <input
                className="w-full rounded border border-zinc-700 bg-zinc-950 p-3"
                value={newTile.mvp_points}
                onChange={(e) =>
                  setNewTile((current) => ({
                    ...current,
                    mvp_points: e.target.value,
                  }))
                }
                placeholder="1"
              />
            </div>

            <div className="md:col-span-2 xl:col-span-3">
              <label className="block mb-2 text-sm text-zinc-400">Title</label>
              <input
                className="w-full rounded border border-zinc-700 bg-zinc-950 p-3"
                value={newTile.title}
                onChange={(e) =>
                  setNewTile((current) => ({
                    ...current,
                    title: e.target.value,
                  }))
                }
                placeholder="Tile title"
              />
            </div>

            <div className="md:col-span-2 xl:col-span-3">
              <label className="block mb-2 text-sm text-zinc-400">
                Description
              </label>
              <textarea
                className="w-full rounded border border-zinc-700 bg-zinc-950 p-3"
                value={newTile.description}
                onChange={(e) =>
                  setNewTile((current) => ({
                    ...current,
                    description: e.target.value,
                  }))
                }
                placeholder="Optional description"
              />
            </div>

            <div className="md:col-span-2 xl:col-span-3">
              <label className="block mb-2 text-sm text-zinc-400">
                Image URL
              </label>
              <input
                className="w-full rounded border border-zinc-700 bg-zinc-950 p-3"
                value={newTile.image_url}
                onChange={(e) =>
                  setNewTile((current) => ({
                    ...current,
                    image_url: e.target.value,
                  }))
                }
                placeholder="https://..."
              />
            </div>
          </div>

          <button
            onClick={addTile}
            className="mt-5 rounded bg-green-600 px-5 py-3 font-semibold hover:bg-green-500"
          >
            Add Tile
          </button>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-semibold">Tiles</h2>
            <div className="text-sm text-zinc-400">
              {sortedTiles.length} tile{sortedTiles.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="space-y-4">
            {sortedTiles.map((tile) => (
              <div
                key={tile.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="block mb-2 text-sm text-zinc-400">
                      Row
                    </label>
                    <input
                      className="w-full rounded border border-zinc-700 bg-zinc-900 p-3"
                      value={tile.row_index}
                      onChange={(e) =>
                        updateTileField(tile.id, "row_index", Number(e.target.value))
                      }
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm text-zinc-400">
                      Col
                    </label>
                    <input
                      className="w-full rounded border border-zinc-700 bg-zinc-900 p-3"
                      value={tile.col_index}
                      onChange={(e) =>
                        updateTileField(tile.id, "col_index", Number(e.target.value))
                      }
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm text-zinc-400">
                      MVP Points
                    </label>
                    <input
                      className="w-full rounded border border-zinc-700 bg-zinc-900 p-3"
                      value={tile.mvp_points}
                      onChange={(e) =>
                        updateTileField(
                          tile.id,
                          "mvp_points",
                          Number(e.target.value)
                        )
                      }
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm text-zinc-400">
                      Tile ID
                    </label>
                    <div className="rounded border border-zinc-800 bg-zinc-900 p-3 text-xs text-zinc-400 break-all">
                      {tile.id}
                    </div>
                  </div>

                  <div className="md:col-span-2 xl:col-span-4">
                    <label className="block mb-2 text-sm text-zinc-400">
                      Title
                    </label>
                    <input
                      className="w-full rounded border border-zinc-700 bg-zinc-900 p-3"
                      value={tile.title}
                      onChange={(e) =>
                        updateTileField(tile.id, "title", e.target.value)
                      }
                    />
                  </div>

                  <div className="md:col-span-2 xl:col-span-4">
                    <label className="block mb-2 text-sm text-zinc-400">
                      Description
                    </label>
                    <textarea
                      className="w-full rounded border border-zinc-700 bg-zinc-900 p-3"
                      value={tile.description ?? ""}
                      onChange={(e) =>
                        updateTileField(tile.id, "description", e.target.value)
                      }
                    />
                  </div>

                  <div className="md:col-span-2 xl:col-span-4">
                    <label className="block mb-2 text-sm text-zinc-400">
                      Image URL
                    </label>
                    <input
                      className="w-full rounded border border-zinc-700 bg-zinc-900 p-3"
                      value={tile.image_url ?? ""}
                      onChange={(e) =>
                        updateTileField(tile.id, "image_url", e.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => saveTile(tile)}
                    className="rounded bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-500"
                  >
                    Save Tile
                  </button>

                  <button
                    onClick={() => deleteTile(tile.id)}
                    className="rounded bg-red-600 px-4 py-2 font-semibold hover:bg-red-500"
                  >
                    Delete Tile
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}