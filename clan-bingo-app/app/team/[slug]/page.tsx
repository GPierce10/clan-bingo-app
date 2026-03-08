type TeamPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function TeamPage({ params }: TeamPageProps) {
  const { slug } = await params;

  const boardSize = 6;
  const tiles = Array.from({ length: boardSize * boardSize }, (_, i) => i + 1);

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-4xl font-bold mb-2 capitalize">
          {slug.replaceAll("-", " ")}
        </h1>
        <p className="text-zinc-400 mb-8">Team board page</p>

        <div className="grid grid-cols-6 gap-3">
          {tiles.map((tile) => (
            <div
              key={tile}
              className="aspect-square rounded-lg border border-zinc-800 bg-zinc-900 p-3 flex items-center justify-center text-center text-sm font-semibold"
            >
              Tile {tile}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}