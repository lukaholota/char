import NextAuth, { NextAuthConfig } from "next-auth"
import { OAuth2Client } from "google-auth-library";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "@auth/core/providers/google";
import Credentials from "@auth/core/providers/credentials";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

const googleClient = new OAuth2Client();

export const config = {
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  adapter: PrismaAdapter(prisma),
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
          let user: User | null = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: "google",
                providerAccountId: sub,
              }
            },
            include: { user: true }
          }).then((acc) => acc?.user ?? null);
          if (!user) {
            user = await prisma.user.findUnique({
              where: { email }
            });

            if (!user) {
              user = await prisma.user.create({
                data: {
                  email,
                  name,
                  image: picture || null,
                  emailVerified: new Date(), 
                }
              });
            }
            await prisma.account.create({
              data: {
                userId: user.id,
                type: "oauth", 
                provider: "google",
                providerAccountId: sub,
              }
            });
          }

          if (!user) {
            return null;
          }

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
