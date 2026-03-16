import { cookies } from "next/headers";
import AdminClient from "../../components/AdminClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPage() {
  const cookieStore = await cookies();
  const adminAuth = cookieStore.get("admin-auth");

  if (adminAuth?.value !== process.env.ADMIN_PASSWORD) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        <form
          action="/api/admin-login"
          method="POST"
          className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4 w-80"
        >
          <h1 className="text-xl font-bold text-center">Admin Login</h1>

          <input
            type="password"
            name="password"
            placeholder="Enter admin password"
            className="w-full p-3 rounded bg-zinc-800 border border-zinc-700"
          />

          <button className="w-full bg-green-600 hover:bg-green-500 p-3 rounded font-bold">
            Login
          </button>
        </form>
      </main>
    );
  }

  return <AdminClient />;
}