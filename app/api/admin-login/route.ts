import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const form = await req.formData();
  const password = form.get("password");

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  const response = NextResponse.redirect(new URL("/admin", req.url));

  response.cookies.set("admin-auth", process.env.ADMIN_PASSWORD!, {
    httpOnly: true,
    path: "/",
  });

  return response;
}