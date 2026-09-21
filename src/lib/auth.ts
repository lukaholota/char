import NextAuth, { NextAuthConfig } from "next-auth"
import { OAuth2Client } from "google-auth-library";
import Google from "@auth/core/providers/google";
import Credentials from "@auth/core/providers/credentials";
import { authAdapter, findOrCreateGoogleUser, findOrCreateQaCredentialsUser } from "@/server/db/auth";
import { getQaCredentialsConfig, verifyQaCredentials } from "@/lib/auth/qa-credentials";

const googleClient = new OAuth2Client();
const qaCredentialsConfig = getQaCredentialsConfig();

export const config = {
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  adapter: authAdapter,
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      id: "google-onetap",
      name: "Google One Tap",
      credentials: {
        id_token: { label: "ID Token", type: "text" },
      },
      async authorize(creds) {
        try {
          const idToken = creds?.id_token as string | undefined;
          if (!idToken) {
            console.error("No ID token provided");
            return null;
          }

          const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.AUTH_GOOGLE_ID,
          });
          const payload = ticket.getPayload();
          if (!payload) {
            console.error("No payload in ticket");
            return null;
          }

          const sub = payload.sub;
          const email = payload.email;
          const email_verified = payload.email_verified;
          const name = payload.name ?? "";
          const picture = payload.picture ?? "";

          if (!sub || !email || email_verified !== true) {
            console.error("Invalid payload data", { sub, email, email_verified });
            return null;
          }
          const user = await findOrCreateGoogleUser({
            providerAccountId: sub,
            email,
            name,
            image: picture,
          });

          return {
            id: String(user.id),
            email: user.email,
            name: user.name,
            image: user.image,
          };
        } catch (error) {
          console.error("Authorization error:", error);
          return null;
        }
      },
    }),
    ...(qaCredentialsConfig
      ? [
          Credentials({
            id: "qa-credentials",
            name: "QA credentials",
            credentials: {
              email: { label: "Email", type: "email" },
              password: { label: "Password", type: "password" },
            },
            async authorize(creds) {
              const email = typeof creds?.email === "string" ? creds.email : "";
              const password = typeof creds?.password === "string" ? creds.password : "";

              if (!verifyQaCredentials(qaCredentialsConfig, email, password)) {
                return null;
              }

              const user = await findOrCreateQaCredentialsUser(qaCredentialsConfig.email);
              return {
                id: String(user.id),
                email: user.email,
                name: user.name,
                image: user.image,
              };
            },
          }),
        ]
      : []),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) token.userId = user.id as string;
      return token;
    },
    async session({ session, token }) {
      if (token?.userId) session.user.id = token.userId as string;
      return session;
    }
  },

  debug: process.env.NODE_ENV === "development",
} satisfies NextAuthConfig;

export const { auth, handlers, signIn, signOut } = NextAuth(config);
