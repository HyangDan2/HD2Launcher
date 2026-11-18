import { Check, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { LauncherApp } from '../types/launcher';
import { IconGlyph } from './IconGlyph';

export const MAX_PAGES = 5;
export const SLOTS_PER_PAGE = 20; // 4 cols x 5 rows
export const TOTAL_SLOTS = MAX_PAGES * SLOTS_PER_PAGE;

interface PagedAppGridProps {
  appsById: Map<string, LauncherApp>;
  slots: (string | null)[];
  pageCount: number;
  currentPage: number;
  editMode: boolean;
  onChangePage: (page: number) => void;
  onEnterEditMode: () => void;
  onExitEditMode: () => void;
  onMoveSlot: (fromSlot: number, toSlot: number) => void;
  onLaunchApp: (app: LauncherApp) => void;
  onRemoveCustomApp: (id: string) => void;
  onOpenWallpaperPicker: () => void;
}

export function PagedAppGrid({
  appsById,
  slots,
  pageCount,
  currentPage,
  editMode,
  onChangePage,
  onEnterEditMode,
  onExitEditMode,
  onMoveSlot,
  onLaunchApp,
  onRemoveCustomApp,
  onOpenWallpaperPicker,
}: PagedAppGridProps) {
  const [draggingFromSlot, setDraggingFromSlot] = useState<number | null>(null);
  const [hoverSlot, setHoverSlot] = useState<number | null>(null);
  const [swipeOffsetX, setSwipeOffsetX] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const bgLongPressTimerRef = useRef<number | null>(null);
  const edgeFlipTimerRef = useRef<number | null>(null);

  const iconDragStartRef = useRef<{
    slotIndex: number;
    x: number;
    y: number;
  } | null>(null);
  const isDraggingIconRef = useRef(false);
  const pointerMovedRef = useRef(false);
  const longPressTriggeredRef = useRef(false);

  const bgSwipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const isSwipingPageRef = useRef(false);

  const clearTimers = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (bgLongPressTimerRef.current !== null) {
      window.clearTimeout(bgLongPressTimerRef.current);
      bgLongPressTimerRef.current = null;
    }
    if (edgeFlipTimerRef.current !== null) {
      window.clearTimeout(edgeFlipTimerRef.current);
      edgeFlipTimerRef.current = null;
    }
  };

  // --- Icon Pointer Handlers ---
  const handleIconPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    slotIndex: number,
  ) => {
    if ((e.target as HTMLElement).closest('button[data-delete-btn="true"]')) {
      return;
    }
    clearTimers();

    iconDragStartRef.current = { slotIndex, x: e.clientX, y: e.clientY };
    isDraggingIconRef.current = false;
    pointerMovedRef.current = false;
    longPressTriggeredRef.current = false;

    if (editMode) {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
    } else {
      longPressTimerRef.current = window.setTimeout(() => {
        if (pointerMovedRef.current) return;
        longPressTriggeredRef.current = true;
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate?.(18);
        }
        onEnterEditMode();
      }, 450);
    }
  };

  const handleIconPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = iconDragStartRef.current;
    if (!start) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 8) {
      pointerMovedRef.current = true;
    }

    if (!editMode) {
      if (dist > 8 && longPressTimerRef.current !== null) {
        window.clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      return;
    }

    if (!isDraggingIconRef.current && dist > 8) {
      isDraggingIconRef.current = true;
      setDraggingFromSlot(start.slotIndex);
    }

    if (isDraggingIconRef.current) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const slotEl = el?.closest('[data-slot-index]') as HTMLElement | null;
      const targetIdx =
        slotEl?.dataset.slotIndex !== undefined
          ? Number(slotEl.dataset.slotIndex)
          : null;

      setHoverSlot(
        targetIdx !== null && targetIdx !== start.slotIndex ? targetIdx : null,
      );

      // Edge auto-page-flip when dragging icon near left/right edge
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const relX = e.clientX - rect.left;
        if (relX < 28 && currentPage > 0) {
          if (edgeFlipTimerRef.current === null) {
            edgeFlipTimerRef.current = window.setTimeout(() => {
              onChangePage(Math.max(0, currentPage - 1));
              edgeFlipTimerRef.current = null;
            }, 420);
          }
        } else if (relX > rect.width - 28 && currentPage < pageCount - 1) {
          if (edgeFlipTimerRef.current === null) {
            edgeFlipTimerRef.current = window.setTimeout(() => {
              onChangePage(Math.min(pageCount - 1, currentPage + 1));
              edgeFlipTimerRef.current = null;
            }, 420);
          }
        } else if (edgeFlipTimerRef.current !== null) {
          window.clearTimeout(edgeFlipTimerRef.current);
          edgeFlipTimerRef.current = null;
        }
      }
    }
  };

  const handleIconPointerUp = (app: LauncherApp) => {
    const start = iconDragStartRef.current;
    clearTimers();

    if (
      isDraggingIconRef.current &&
      start &&
      hoverSlot !== null &&
      start.slotIndex !== hoverSlot
    ) {
      onMoveSlot(start.slotIndex, hoverSlot);
    } else if (
      !isDraggingIconRef.current &&
      !pointerMovedRef.current &&
      !longPressTriggeredRef.current &&
      !editMode
    ) {
      onLaunchApp(app);
    }

    iconDragStartRef.current = null;
    isDraggingIconRef.current = false;
    pointerMovedRef.current = false;
    longPressTriggeredRef.current = false;
    setDraggingFromSlot(null);
    setHoverSlot(null);
  };

  // --- Background / Empty Slot Swipe & Long-Press ---
  const handleBgPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    clearTimers();
    bgSwipeStartRef.current = { x: e.clientX, y: e.clientY };
    isSwipingPageRef.current = false;

    if (!editMode) {
      bgLongPressTimerRef.current = window.setTimeout(() => {
        if (!isSwipingPageRef.current) {
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate?.(18);
          }
          onOpenWallpaperPicker();
        }
      }, 500);
    }
  };

  const handleBgPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = bgSwipeStartRef.current;
    if (!start || isDraggingIconRef.current) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;

    if (Math.hypot(dx, dy) > 10 && bgLongPressTimerRef.current !== null) {
      window.clearTimeout(bgLongPressTimerRef.current);
      bgLongPressTimerRef.current = null;
    }

    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) {
      isSwipingPageRef.current = true;
      // Dampen resistance at page boundaries
      const atLeftEdge = currentPage === 0 && dx > 0;
      const atRightEdge = currentPage === pageCount - 1 && dx < 0;
      setSwipeOffsetX(atLeftEdge || atRightEdge ? dx * 0.25 : dx);
    }
  };

  const handleBgPointerUp = () => {
    clearTimers();
    if (isSwipingPageRef.current) {
      if (swipeOffsetX < -48 && currentPage < pageCount - 1) {
        onChangePage(currentPage + 1);
      } else if (swipeOffsetX > 48 && currentPage > 0) {
        onChangePage(currentPage - 1);
      }
    }
    bgSwipeStartRef.current = null;
    isSwipingPageRef.current = false;
    setSwipeOffsetX(0);
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handleBgPointerDown}
      onPointerMove={handleBgPointerMove}
      onPointerUp={handleBgPointerUp}
      onPointerCancel={handleBgPointerUp}
      className="relative flex min-h-0 w-full flex-1 touch-none flex-col justify-between overflow-hidden select-none"
    >
      {/* Edit mode floating Done button */}
      {editMode && (
        <div className="absolute top-3 right-4 z-30 flex items-center gap-2">
          <span className="rounded-full bg-slate-950/65 px-2.5 py-1 text-[10px] font-medium text-white/90 backdrop-blur-md">
            빈칸으로도 드래그 이동 가능
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExitEditMode();
            }}
            className="inline-flex items-center gap-1 rounded-full bg-sky-500 px-3 py-1 text-xs font-semibold text-white shadow-lg"
          >
            <Check className="h-3.5 w-3.5" />
            <span>완료</span>
          </button>
        </div>
      )}

      {/* Multi-Page Horizontal Carousel (responsive 5 rows, never clips on mobile PWA) */}
      <div
        className="flex min-h-0 w-full flex-1 items-stretch pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-1"
        style={{
          transform: `translate3d(calc(${-currentPage * 100}% + ${swipeOffsetX}px), 0, 0)`,
          transition:
            swipeOffsetX === 0
              ? 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)'
              : 'none',
        }}
      >
        {Array.from({ length: pageCount }).map((_, pageIndex) => {
          const pageStart = pageIndex * SLOTS_PER_PAGE;
          const pageSlots = slots.slice(pageStart, pageStart + SLOTS_PER_PAGE);

          return (
            <div
              key={pageIndex}
              className="grid h-full w-full shrink-0 grid-cols-4 grid-rows-5 gap-x-2 gap-y-1.5 px-4"
            >
              {pageSlots.map((appId, localIdx) => {
                const globalSlotIdx = pageStart + localIdx;
                const app = appId ? appsById.get(appId) : undefined;
                const isDragging = draggingFromSlot === globalSlotIdx;
                const isHoverTarget = hoverSlot === globalSlotIdx;

                if (!app) {
                  // Empty Slot (빈칸)
                  return (
                    <div
                      key={globalSlotIdx}
                      data-slot-index={globalSlotIdx}
                      className={`flex items-center justify-center rounded-2xl transition ${
                        isHoverTarget
                          ? 'border-2 border-dashed border-sky-400 bg-sky-400/20'
                          : editMode
                            ? 'border border-dashed border-white/15 bg-white/[0.03]'
                            : ''
                      }`}
                    />
                  );
                }

                return (
                  <div
                    key={globalSlotIdx}
                    data-slot-index={globalSlotIdx}
                    onPointerDown={(e) =>
                      handleIconPointerDown(e, globalSlotIdx)
                    }
                    onPointerMove={handleIconPointerMove}
                    onPointerUp={() => handleIconPointerUp(app)}
                    onPointerCancel={() => {
                      clearTimers();
                      iconDragStartRef.current = null;
                      isDraggingIconRef.current = false;
                      setDraggingFromSlot(null);
                      setHoverSlot(null);
                    }}
                    className={`relative flex cursor-pointer touch-none flex-col items-center justify-center rounded-2xl transition-transform duration-150 ${
                      editMode ? 'animate-jiggle' : ''
                    } ${isDragging ? 'scale-110 opacity-55' : ''} ${
                      isHoverTarget
                        ? 'scale-105 bg-white/15 ring-2 ring-sky-400'
                        : ''
                    }`}
                  >
                    {/* Delete button for custom apps in Edit Mode */}
                    {editMode && app.category === 'custom' && (
                      <button
                        type="button"
                        data-delete-btn="true"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveCustomApp(app.id);
                        }}
                        className="absolute top-0 right-1 z-20 rounded-full bg-slate-900 p-1 text-white shadow ring-2 ring-white/30 hover:bg-rose-500"
                        title="앱 삭제"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}

                    <div
                      className={`relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-[18px] bg-gradient-to-br ${app.gradient} text-white shadow-lg shadow-black/50 ring-1 ring-white/25 transition-transform active:scale-95`}
                    >
                      {app.thumbnailUrl ? (
                        <img
                          src={app.thumbnailUrl}
                          alt={app.name}
                          className="h-full w-full object-cover"
                          draggable={false}
                        />
                      ) : (
                        <>
                          <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[18px] bg-gradient-to-b from-white/25 to-transparent" />
                          <IconGlyph
                            name={app.iconName}
                            className="relative z-10 h-7 w-7 drop-shadow-md"
                          />
                        </>
                      )}
                      {app.adminOnly && (
                        <span className="absolute bottom-0.5 rounded bg-slate-950/90 px-1 py-0.2 text-[8px] font-bold tracking-wider text-rose-300 ring-1 ring-rose-400/50">
                          ADMIN
                        </span>
                      )}
                    </div>

                    <span className="mt-1.5 max-w-[74px] truncate rounded-md bg-slate-950/45 px-1.5 py-0.5 text-center text-[11px] font-medium text-white drop-shadow backdrop-blur-[2px]">
                      {app.name}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Page Indicator Dots */}
      <div className="relative z-10 flex items-center justify-center gap-2 pb-2.5">
        {Array.from({ length: pageCount }).map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChangePage(idx);
            }}
            aria-label={`${idx + 1}페이지로 이동`}
            className={`h-2 rounded-full transition-all ${
              currentPage === idx
                ? 'w-5 bg-white shadow'
                : 'w-2 bg-white/40 hover:bg-white/70'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
