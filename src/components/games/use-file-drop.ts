"use client";

import { useState, type DragEvent } from "react";

const hasFiles = (event: DragEvent) => event.dataTransfer.types.includes("Files");

/// Файл з папки кидають на кнопку завантаження — так само, як обраний через діалог.
export function useFileDrop(onFile: (file: File) => void, isDisabled = false) {
  const [isOver, setIsOver] = useState(false);
  const bindDrop = {
    onDragOver: (event: DragEvent) => {
      if (isDisabled || !hasFiles(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setIsOver(true);
    },
    onDragLeave: () => setIsOver(false),
    onDrop: (event: DragEvent) => {
      setIsOver(false);
      if (isDisabled || !hasFiles(event)) return;
      event.preventDefault();
      const file = event.dataTransfer.files[0];
      if (file) onFile(file);
    },
  };
  return { isOver: isOver && !isDisabled, bindDrop };
}
