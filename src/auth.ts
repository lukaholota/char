import NextAuth, { NextAuthConfig, type User } from "next-auth"
import { OAuth2Client } from "google-auth-library";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "@auth/core/providers/google";
import Credentials, { CredentialInput } from "@auth/core/providers/credentials";
import { prisma } from "@/prisma";

const googleClient = new OAuth2Client();

export const config = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials<{ id_token: CredentialInput }>({
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

          if (!sub || !email || email_verified !== true ) {
            console.error("Invalid payload data", { sub, email, email_verified });
            return null;
          }

          const user = await prisma.user.upsert({
            where: { email },
            update: { name: name ?? "", image: picture ?? null},
            create: {
              email,
              name: name ?? "",
              image: picture ?? null,
            }
          });

          const authUser: User = {
            id: String(user.id),              // <- cast до string
            email: user.email,
            name: user.name,
            image: user.image ?? null,        // <- null, не undefined
          };
          return authUser;
        } catch (error) {
          console.error("Authorization error:", error);
          return null;
        }

      },
    }),
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

export const { auth, handlers, signIn, signOut,  } = NextAuth(config)