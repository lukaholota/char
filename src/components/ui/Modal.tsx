"use client"

import { ReactNode, useEffect, useRef } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export const Modal = ({open, onClose, children}: Props) => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [open])

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    }

    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      className="
        rounded-xl
        bg-slate-700
        text-white
        backdrop:bg-black/50
        backdrop:backdrop-blur-sm
        p-0
        open:animate-fadeIn
        animate-fadeOut
      "
    >
      <div className="p-6">{children}</div>
    </dialog>
  )
}

export default Modal;