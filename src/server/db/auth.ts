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

export async function findQaAccountUser(email: string): Promise<AuthenticatedUser | null> {
  return prisma.user.findFirst({
    where: { email, name: "QA browser", accounts: { none: {} } },
    select: { id: true, email: true, name: true, image: true },
  });
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
  await claimEmailVerifiedByGoogle(user.id);
  return user;
}

/// Пароль без підтвердження пошти міг поставити будь-хто. Коли Google підтверджує власника, такий пароль стирається.
export async function claimEmailVerifiedByGoogle(userId: number): Promise<void> {
  await prisma.user.updateMany({ where: { id: userId, emailVerified: null }, data: { emailVerified: new Date(), passwordHash: null } });
}

export async function findPasswordHash(email: string): Promise<{ user: AuthenticatedUser; passwordHash: string } | null> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true, image: true, passwordHash: true } });
  if (!user?.passwordHash) return null;
  const { passwordHash, ...rest } = user;
  return { user: rest, passwordHash };
}

export type PasswordAccount = { email: string | null; isEmailVerified: boolean; passwordHash: string | null };

export async function findPasswordAccount(userId: number): Promise<PasswordAccount | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, emailVerified: true, passwordHash: true } });
  return user && { email: user.email, isEmailVerified: user.emailVerified !== null, passwordHash: user.passwordHash };
}

/// Пише лише поверх того хешу, який перевірили, — паралельна зміна з іншого пристрою не перезапишеться мовчки.
export async function replacePasswordHash(userId: number, checkedHash: string | null, nextHash: string): Promise<boolean> {
  const updated = await prisma.user.updateMany({ where: { id: userId, emailVerified: { not: null }, passwordHash: checkedHash }, data: { passwordHash: nextHash } });
  return updated.count === 1;
}

export async function createPasswordUser(email: string, passwordHash: string): Promise<AuthenticatedUser | null> {
  const name = email.split("@")[0];
  const created = await prisma.user.createMany({ data: [{ email, name, passwordHash }], skipDuplicates: true });
  if (created.count === 0) return null;
  return prisma.user.findUniqueOrThrow({ where: { email }, select: { id: true, email: true, name: true, image: true } });
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
