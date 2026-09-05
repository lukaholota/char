import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { isOfflineOperation, type OfflineOperation } from "@/lib/offline/operations";
import { applyOwnedOfflineOperation } from "@/server/db/offline-operations";
import { findUserIdByEmail } from "@/server/db/users";

const MAX_OPERATIONS_PER_REQUEST = 200;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });

  const userId = await findUserIdByEmail(session.user.email);
  if (userId === null) return NextResponse.json({ error: "Користувача не знайдено" }, { status: 401 });

  const operations = readOperations(await request.json().catch(() => null));
  if (!operations) return NextResponse.json({ error: "Некоректна черга" }, { status: 400 });

  const applied: string[] = [];
  const rejected: string[] = [];
  const touchedPersIds = new Set<number>();

  for (const operation of operations) {
    const result = await applyOwnedOfflineOperation(userId, operation);
    if (result.ok) {
      applied.push(operation.operationId);
      if (!result.duplicate) touchedPersIds.add(operation.persId);
    } else {
      rejected.push(operation.operationId);
    }
  }

  for (const persId of touchedPersIds) revalidatePath(`/char/${persId}`);

  return NextResponse.json({ applied, rejected });
}

function readOperations(body: unknown): OfflineOperation[] | null {
  if (!body || typeof body !== "object" || !("operations" in body)) return null;

  const { operations } = body as { operations?: unknown };
  if (!Array.isArray(operations) || operations.length > MAX_OPERATIONS_PER_REQUEST) return null;
  if (!operations.every(isOfflineOperation)) return null;

  return operations;
}
