import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authAdapter = PrismaAdapter(prisma);

export type AuthenticatedUser = {
  id: number;
  email: string | null;
  name: string | null;
  image: string | null;
};

type GoogleUserDetails = {
  providerAccountId: string;
  email: string;
  name: string;
  image: string;
};

type UserDetails = Pick<GoogleUserDetails, "email" | "name" | "image">;

export async function findOrCreateGoogleUser(details: GoogleUserDetails): Promise<AuthenticatedUser> {
  const accountUser = await findUserByGoogleAccountId(details.providerAccountId);
  if (accountUser) {
    return accountUser;
  }

  const user = await findOrCreateUserByEmail(details);
  await linkGoogleAccount(user.id, details.providerAccountId);
  return user;
}

export async function findOrCreateQaCredentialsUser(email: string): Promise<AuthenticatedUser> {
  return findOrCreateUserByEmail({ email, name: "QA browser", image: "" });
}

async function findUserByGoogleAccountId(providerAccountId: string): Promise<AuthenticatedUser | null> {
  return prisma.account
    .findUnique({
      where: {
        provider_providerAccountId: {
          provider: "google",
          providerAccountId,
        },
      },
      include: { user: true },
    })
    .then((account) => account?.user ?? null);
}

async function findOrCreateUserByEmail(details: UserDetails): Promise<AuthenticatedUser> {
  let user = await prisma.user.findUnique({ where: { email: details.email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: details.email,
        name: details.name,
        image: details.image || null,
        emailVerified: new Date(),
      },
    });
  }
  return user;
}

async function linkGoogleAccount(userId: number, providerAccountId: string): Promise<void> {
  await prisma.account.create({
    data: {
      userId,
      type: "oauth",
      provider: "google",
      providerAccountId,
    },
  });
}
