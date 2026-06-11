import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export interface SessionData {
  userId?: number;
  username?: string;
  displayName?: string;
}

export const sessionOptions: SessionOptions = {
  // LAN-only app: a static local secret is acceptable; can be overridden via env.
  password:
    process.env.SESSION_SECRET ?? "eye-emr-local-secret-change-me-0123456789abcdef",
  cookieName: "eye_emr_session",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // served over plain http on the LAN
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

/** For server components / actions: returns the logged-in user or redirects to /login. */
export async function requireUser() {
  const session = await getSession();
  if (!session.userId) redirect("/login");
  return {
    userId: session.userId,
    username: session.username!,
    displayName: session.displayName!,
  };
}
