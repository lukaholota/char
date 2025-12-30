/**
 * Spells layout with parallel slot for modal overlay
 * 
 * This enables intercepting routes: when navigating from /spells to /spells/[id],
 * the modal slot renders the intercepting route while keeping the list visible.
 */
export default function SpellsLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
