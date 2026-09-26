"use client";

import { Fragment } from "react";

import type { ClassTable, ClassTableColumnKind, ClassTableFeatureRef, ClassTableRow } from "@/rules/class-table";
import { cn } from "@/lib/utils";

const HEADER_CELL: Record<ClassTableColumnKind, string> = {
  level: "sticky left-0 z-20 w-14 bg-slate-900 px-2 sm:w-16",
  proficiency: "w-24 px-2 sm:w-28",
  features: "min-w-[220px] px-2",
  compact: "w-20 px-2 text-center sm:w-24",
  slot: "w-8 px-1 text-center sm:w-9",
};

const BODY_CELL: Record<ClassTableColumnKind, string> = {
  level: "sticky left-0 z-10 bg-slate-900 px-2",
  proficiency: "px-2",
  features: "whitespace-normal break-normal px-2 leading-snug",
  compact: "px-1 text-center",
  slot: "px-1 text-center",
};

/// Ширина таблиці більша за телефон: прокручується лише її власний контейнер, а колонка рівня
/// лишається на місці, щоб рядок не губився під час горизонтальної прокрутки.
/// `onOpenFeature` є лише в каталозі: там назва здібності веде до її опису в тій самій картці.
export function ClassTableView({
  table,
  className,
  onOpenFeature,
}: {
  table: ClassTable;
  className?: string;
  onOpenFeature?: (feature: ClassTableFeatureRef) => void;
}) {
  return (
    <div className={cn("w-full min-w-0 max-w-full overflow-auto overscroll-x-contain rounded-xl border border-white/10 bg-slate-900", className)}>
      <table className="w-full table-auto border-separate border-spacing-0 text-left text-xs sm:text-sm" style={{ minWidth: `${table.minWidth}px` }}>
        <thead className="sticky top-0 z-30 text-slate-100">
          <tr>
            {table.columns.map((column) => (
              <th key={column.key} scope="col" className={cn("bg-slate-900 py-2 font-semibold", HEADER_CELL[column.kind])}>
                <span className="block whitespace-normal break-words leading-tight">{column.label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.level} className="align-top text-slate-200">
              {row.cells.map((cell, index) => {
                const column = table.columns[index];
                return index === 0 ? (
                  <th key={column.key} scope="row" className={cn("border-t border-white/10 py-2 font-normal", BODY_CELL[column.kind])}>
                    {cell}
                  </th>
                ) : (
                  <td key={column.key} className={cn("border-t border-white/10 py-2", BODY_CELL[column.kind])}>
                    {column.kind === "features" && onOpenFeature && row.features.length > 0 ? (
                      <FeatureLinks row={row} onOpen={onOpenFeature} />
                    ) : (
                      cell
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FeatureLinks({ row, onOpen }: { row: ClassTableRow; onOpen: (feature: ClassTableFeatureRef) => void }) {
  return (
    <>
      {row.features.map((feature, index) => (
        <Fragment key={`${feature.kind}-${feature.name}`}>
          {index > 0 ? ", " : null}
          <button
            type="button"
            onClick={() => onOpen(feature)}
            className="rounded text-left underline decoration-slate-500 decoration-dotted underline-offset-4 hover:text-white hover:decoration-slate-300"
          >
            {feature.name}
          </button>
        </Fragment>
      ))}
    </>
  );
}
