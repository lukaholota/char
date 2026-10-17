import { toast } from "sonner";

export function offerLinkedDraft(continueWithLinkedDraft: () => void): void {
  toast("Продовжити збережений прогрес?", {
    id: "linked-draft",
    description: "Посилання несе вибори з іншого браузера. Якщо продовжити, вони замінять чернетку, що вже є тут.",
    duration: Infinity,
    action: { label: "Продовжити", onClick: continueWithLinkedDraft },
    cancel: { label: "Залишити цю", onClick: () => {} },
  });
}
