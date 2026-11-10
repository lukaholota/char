export function findRoomPeople<Member extends { heroSlot: number }>(members: readonly Member[]): Member[] {
  return members.filter((member) => member.heroSlot === 0);
}

type SheetViewer = { myRole: "GM" | "PLAYER"; myUserId: number; myPersIds: readonly number[]; members: readonly { userId: number; persId: number | null }[] };

/// Майстер веде й чужих героїв своєї кімнати (кидає за них, витрачає комірки), гравець — лише своїх.
export function listSheetPersIds(viewer: SheetViewer): number[] {
  if (viewer.myRole !== "GM") return [...viewer.myPersIds];
  const otherPersIds = viewer.members.flatMap((member) => (member.userId !== viewer.myUserId && member.persId !== null ? [member.persId] : []));
  return [...viewer.myPersIds, ...otherPersIds];
}

/// Чужий чи застарілий ?hero= показує першого доступного героя: лист віддаємо лише тому, хто його веде.
export function findShownHeroPersId(requestedPersId: string | null, sheetPersIds: readonly number[]): number | null {
  const persId = Number(requestedPersId);
  return sheetPersIds.includes(persId) ? persId : (sheetPersIds[0] ?? null);
}
