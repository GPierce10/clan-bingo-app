import Link from "next/link";

const teams = [
  { name: "Team 1", slug: "team-1" },
  { name: "Team 2", slug: "team-2" },
  { name: "Team 3", slug: "team-3" },
  { name: "Team 4", slug: "team-4" },
  { name: "Team 5", slug: "team-5" },
  { name: "Team 6", slug: "team-6" },
  { name: "Team 7", slug: "team-7" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-4xl font-bold mb-2">Clan Bingo</h1>
        <p className="text-zinc-400 mb-8">
          Leaderboard, team boards, MVP standings, and event progress.
        </p>

        <section className="mb-10">
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
                {teams.map((team, index) => (
                  <tr key={team.slug} className="border-t border-zinc-800">
                    <td className="p-3">{index + 1}</td>
                    <td className="p-3">{team.name}</td>
                    <td className="p-3">0</td>
                    <td className="p-3">0</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Teams</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {teams.map((team) => (
              <Link
                key={team.slug}
                href={`/team/${team.slug}`}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 hover:bg-zinc-800 transition"
              >
                <div className="text-xl font-semibold">{team.name}</div>
                <div className="text-zinc-400 mt-1">Open board</div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}