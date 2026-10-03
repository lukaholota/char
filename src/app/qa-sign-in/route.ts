import { auth, signIn } from "@/lib/auth";
import { getQaAccountEmail } from "@/lib/auth/qa-account";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const redirectToChar = () => {
    return new Response(null, { status: 307, headers: { location: "/char", "x-robots-tag": "noindex, nofollow" } });
  };

  const session = await auth();
  if (session?.user) return redirectToChar();
  if (!getQaAccountEmail()) return new Response(null, { status: 503, headers: { "x-robots-tag": "noindex, nofollow" } });

  const destination = await signIn("qa-bootstrap", { redirectTo: "/char", redirect: false });
  if (new URL(destination, request.url).pathname !== "/char") {
    return new Response(null, { status: 503, headers: { "x-robots-tag": "noindex, nofollow" } });
  }
  return redirectToChar();
}
