"use client";

import { useState } from "react";

type PlayerBreakdown = {
  player_name: string;
  total_points: number;
  tiles: {
    tile_title: string;
    points_awarded: number;
  }[];
};

type TeamRosterPopoverProps = {
  players: PlayerBreakdown[];
};

export default function TeamRosterPopover({
  players,
}: TeamRosterPopoverProps) {
  const [openPlayer, setOpenPlayer] = useState<string | null>(null);

  const togglePlayer = (playerName: string) => {
    setOpenPlayer((current) => (current === playerName ? null : playerName));
  };

  return (
    <div className="flex flex-wrap gap-2">
      {players.map((player) => {
        const isOpen = openPlayer === player.player_name;

        return (
          <div key={player.player_name} className="relative">
            <button
              type="button"
              title={`${player.total_points} MVP points`}
              onClick={() => togglePlayer(player.player_name)}
              className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-200 hover:bg-zinc-800"
            >
              {player.player_name}
            </button>

            {isOpen && (
              <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border border-zinc-700 bg-zinc-950 p-4 shadow-xl">
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-semibold">{player.player_name}</div>
                  <div className="text-sm text-zinc-400">
                    {player.total_points} pts
                  </div>
                </div>

                {player.tiles.length === 0 ? (
                  <div className="text-sm text-zinc-500">
                    No MVP points yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {player.tiles.map((tile, index) => (
                      <div
                        key={`${player.player_name}-${tile.tile_title}-${index}`}
                        className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-sm"
                      >
                        <span className="pr-3">{tile.tile_title}</span>
                        <span className="text-zinc-400">
                          {tile.points_awarded} pts
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}