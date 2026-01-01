import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { MagicItemDetailPane } from "@/lib/components/magicItems/MagicItemDetailPane";
import { useModalBackButton } from "@/hooks/useModalBackButton";

interface Props {
  item: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MagicItemInfoModal({ item, open, onOpenChange }: Props) {
  useModalBackButton(open, () => onOpenChange(false));

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-h-[85vh] w-[92vw] max-w-xl overflow-y-auto overflow-x-hidden p-0 border-0 bg-transparent shadow-none selection:bg-teal-500/30"
        showClose={false}
      >
        <div className="sr-only">
            <DialogTitle>{item.name}</DialogTitle>
        </div>
        <div className="relative">
            <MagicItemDetailPane item={item} />
            <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="absolute top-3 right-3 z-50 glass-panel inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/50 text-slate-200/90 hover:text-teal-300 transition-all"
                aria-label="Закрити"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
