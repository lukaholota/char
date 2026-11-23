"use client";

import { useState, type DragEvent } from "react";

const hasFiles = (event: DragEvent) => event.dataTransfer.types.includes("Files");

/// Файл з папки кидають на кнопку завантаження — так само, як обраний через діалог.
export function useFileDrop(onFile: (file: File) => void, isDisabled = false, onFiles?: (files: File[]) => void) {
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
      const files = Array.from(event.dataTransfer.files);
      if (files.length > 1 && onFiles) onFiles(files);
      else if (files[0]) onFile(files[0]);
    },
  };
  return { isOver: isOver && !isDisabled, bindDrop };
}
