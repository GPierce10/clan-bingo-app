"use client";

import { useState } from "react";

type MvpPlayer = {
  player_name: string;
  points: number;
  tiles: {
    tile_title: string;
    points_awarded: number;
    team_name: string;
  }[];
};

type HomeMvpPopoverProps = {
  players: MvpPlayer[];
};

export default function HomeMvpPopover({ players }: HomeMvpPopoverProps) {
  const [openPlayer, setOpenPlayer] = useState<string | null>(null);

  const togglePlayer = (playerName: string) => {
    setOpenPlayer((current) => (current === playerName ? null : playerName));
  };

  return (
    <div className="divide-y divide-zinc-800">
      {players.length === 0 ? (
        <div className="p-4 text-zinc-400">No MVP points yet.</div>
      ) : (
        players.slice(0, 5).map((player, index) => {
          const isFirst = index === 0;
          const isOpen = openPlayer === player.player_name;

          return (
            <div
              key={`${player.player_name}-${index}`}
              className={`p-4 ${isFirst ? "bg-yellow-500/15" : ""}`}
            >
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => togglePlayer(player.player_name)}
                  title={`${player.points} MVP points`}
                  className={`text-left font-semibold hover:underline ${
                    isFirst ? "text-yellow-300" : ""
                  }`}
                >
                  {isFirst ? "🥇 " : `${index + 1}. `}
                  {player.player_name}
                </button>

                <div
                  className={`font-bold ${
                    isFirst ? "text-yellow-300" : "text-zinc-300"
                  }`}
                >
                  {player.points}
                </div>
              </div>

              {isOpen && (
                <div className="mt-3 rounded-xl border border-zinc-700 bg-zinc-950 p-3">
                  {player.tiles.length === 0 ? (
                    <div className="text-sm text-zinc-500">No tiles found.</div>
                  ) : (
                    <div className="space-y-2">
                      {player.tiles.map((tile, tileIndex) => (
                        <div
                          key={`${player.player_name}-${tile.tile_title}-${tileIndex}`}
                          className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-sm"
                        >
                          <div className="pr-3">
                            <div>{tile.tile_title}</div>
                            <div className="text-xs text-zinc-500">
                              {tile.team_name}
                            </div>
                          </div>
                          <div className="text-zinc-400">
                            {tile.points_awarded} pts
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}