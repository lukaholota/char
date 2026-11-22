// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useFileDrop } from "@/components/games/use-file-drop";

function DropButton({ onFile, isDisabled = false }: { onFile: (file: File) => void; isDisabled?: boolean }) {
  const drop = useFileDrop(onFile, isDisabled);
  return <button type="button" {...drop.bindDrop}>{drop.isOver ? "Сюди" : "Нове"}</button>;
}

const file = new File(["png"], "rock.png", { type: "image/png" });
const withFiles = { dataTransfer: { types: ["Files"], files: [file], dropEffect: "none" } };
afterEach(cleanup);

describe("перетягування файлу на «Нове»", () => {
  it("підсвічує кнопку й віддає кинутий файл", () => {
    const onFile = vi.fn();
    render(<DropButton onFile={onFile} />);
    fireEvent.dragOver(screen.getByRole("button"), withFiles);
    expect(screen.getByRole("button").textContent).toBe("Сюди");
    fireEvent.drop(screen.getByRole("button"), withFiles);
    expect(onFile).toHaveBeenCalledWith(file);
    expect(screen.getByRole("button").textContent).toBe("Нове");
  });

  it("не бере текст і не бере файл, поки кнопка зайнята", () => {
    const onFile = vi.fn();
    const { rerender } = render(<DropButton onFile={onFile} />);
    fireEvent.drop(screen.getByRole("button"), { dataTransfer: { types: ["text/plain"], files: [] } });
    rerender(<DropButton onFile={onFile} isDisabled />);
    fireEvent.dragOver(screen.getByRole("button"), withFiles);
    fireEvent.drop(screen.getByRole("button"), withFiles);
    expect(onFile).not.toHaveBeenCalled();
    expect(screen.getByRole("button").textContent).toBe("Нове");
  });
});
