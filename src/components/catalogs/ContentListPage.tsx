"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CatalogHeader, type CatalogHeaderProps } from "./CatalogHeader";
import { findEditionAccent } from "@/styles/edition-accent";
import { cn } from "@/lib/utils";

export type ContentListPageProps<TItem, TRow = TItem> = CatalogHeaderProps & {
  tabs?: ReactNode;
  topBanner?: ReactNode;
  /// Телефон: банер їде разом зі списком, а не висить над ним увесь час.
  topBannerScrollsWithListOnMobile?: boolean;

  // List data & rendering
  data: TRow[];
  renderItem: (index: number, item: TRow) => ReactNode;
  emptyState?: ReactNode;
  listClassName?: string;
  listContainerClassName?: string;

  // Desktop Detail View
  desktopDetailView: ReactNode;
  detailContainerClassName?: string;

  // Mobile Modal View
  selectedModalItem?: TItem | null;
  onCloseModal?: () => void;
  modalTitle?: string;
  renderModalContent?: (item: TItem) => ReactNode;
  /// Вміст малює власну шапку з закриттям (читач гілки O44) — свій хрестик модалки зайвий.
  isModalChromeHidden?: boolean;

  // Filter Dialog
  filterDialogOpen?: boolean;
  onFilterDialogClose?: () => void;
  filterDialogContent?: ReactNode;
};

export function ContentListPage<TItem, TRow = TItem>({
  // CatalogHeader props
  title,
  is2024 = false,
  totalCount,
  filteredCount,
  subtitle,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  hasActiveFilters,
  activeFiltersCount,
  onOpenFilters,
  onClearFilters,
  headerActions,

  // Layout slots
  tabs,
  topBanner,
  topBannerScrollsWithListOnMobile = false,

  // List props
  data,
  renderItem,
  emptyState,
  listClassName,
  listContainerClassName = "lg:col-span-5 xl:col-span-5 flex flex-col h-full overflow-hidden rounded-xl lg:rounded-2xl border-0 lg:border border-white/10 bg-transparent lg:bg-slate-950/40 lg:backdrop-blur-xl",

  // Desktop detail
  desktopDetailView,
  detailContainerClassName = "hidden lg:block lg:col-span-7 xl:col-span-7 h-full overflow-y-auto pr-1",

  // Mobile modal
  selectedModalItem,
  onCloseModal,
  modalTitle,
  renderModalContent,
  isModalChromeHidden = false,

  // Filter dialog
  filterDialogContent,
}: ContentListPageProps<TItem, TRow>) {
  const [lastModalItem, setLastModalItem] = useState<TItem | null>(selectedModalItem ?? null);
  useEffect(() => {
    if (selectedModalItem) setLastModalItem(selectedModalItem);
  }, [selectedModalItem]);
  const modalItem = selectedModalItem ?? lastModalItem;

  // No tab-bar allowance below: `App` already reserves 4.5rem plus the safe area for it. This
  // shell used to add 7rem of its own on top, and that was the empty strip between the list and
  // the tab bar (KR15.4 §2). What is left is breathing room, nothing more.
  /// Змінні акценту ставимо на корінь сторінки, а не на кожну картку: описи малює
  /// FormattedDescription із 128 місць, і прокидати туди редакцію пропом немає сенсу.
  const accentVariables = findEditionAccent(is2024 ? "2024" : "2014").vars;

  const listHeader = topBannerScrollsWithListOnMobile ? topBanner : null;

  /// Virtuoso перемонтовує Header щоразу, коли це нова функція, тож вона memo-ситься,
  /// а сам вузол банера приходить із незмінним посиланням. Порожній обʼєкт, а не undefined:
  /// undefined затирає дефолт Virtuoso й ламає список на `components.EmptyPlaceholder`.
  const listComponents = useMemo(
    () => (listHeader ? { Header: () => <div className="px-1.5 lg:hidden">{listHeader}</div> } : {}),
    [listHeader]
  );

  return (
    <div
      style={accentVariables}
      className="flex h-full w-full flex-col px-3 sm:px-6 pt-3 sm:pt-6 pb-3 md:pb-6 max-w-7xl mx-auto overflow-hidden"
    >
      {topBanner ? <div className={topBannerScrollsWithListOnMobile ? "hidden lg:block" : undefined}>{topBanner}</div> : null}

      <CatalogHeader
        title={title}
        is2024={is2024}
        totalCount={totalCount}
        filteredCount={filteredCount}
        subtitle={subtitle}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        hasActiveFilters={hasActiveFilters}
        activeFiltersCount={activeFiltersCount}
        onOpenFilters={onOpenFilters}
        onClearFilters={onClearFilters}
        headerActions={headerActions}
      />

      {tabs && <div className="mb-3 shrink-0">{tabs}</div>}

      {/* Main Grid: List + Detail Pane */}
      <div className="grid flex-1 grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 overflow-hidden">
        {/* Left Column: Virtualized List */}
        <div className={listContainerClassName}>
          {data.length === 0 ? (
            <>
              {listHeader ? <div className="px-1.5 pt-1 lg:hidden">{listHeader}</div> : null}
              {emptyState || (
                <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                  <p className="text-sm font-medium text-slate-400">Нічого не знайдено</p>
                  <p className="text-xs text-slate-500 mt-1">Спробуйте змінити фільтри або пошуковий запит</p>
                </div>
              )}
            </>
          ) : (
            <Virtuoso
              data={data}
              components={listComponents}
              className={listClassName || "h-full py-1"}
              itemContent={(index, item) => (
                /// The gutter lives on the row, not on the scroller: react-virtuoso sizes its
                /// rows to the scroller's padding box, so horizontal padding there pushed every
                /// card right and let it run past the right edge (KR13.5 Б1).
                <div className="px-1.5">{renderItem(index, item)}</div>
              )}
            />
          )}
        </div>

        {/* Right Column: Desktop Detail View */}
        <div className={detailContainerClassName}>
          {desktopDetailView}
        </div>
      </div>

      {/* Mobile Detail Modal */}
      {renderModalContent && (
        <Dialog
          open={Boolean(selectedModalItem)}
          onOpenChange={(open) => {
            if (!open && onCloseModal) onCloseModal();
          }}
        >
          <DialogContent
            showClose={!isModalChromeHidden}
            className={cn(
              "grid-cols-[minmax(0,1fr)] min-w-0 max-h-[90dvh] w-[calc(100vw-1rem)] max-w-xl overflow-x-hidden overflow-y-auto border-white/10 bg-slate-950/95 px-4 pb-4 sm:px-6 sm:pb-6 backdrop-blur-2xl text-slate-100",
              isModalChromeHidden ? "pt-3" : "pt-12",
            )}
            aria-describedby={undefined}
          >
            <DialogTitle className="sr-only">
              {modalTitle || "Деталі елемента"}
            </DialogTitle>
            {modalItem && renderModalContent(modalItem)}
          </DialogContent>
        </Dialog>
      )}

      {/* Filter Dialog */}
      {filterDialogContent}
    </div>
  );
}
