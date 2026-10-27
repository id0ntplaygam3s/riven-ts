import { createContext, startTransition, use, useMemo, useState } from "react";

import { SelectionActionBar } from "#components/selection-action-bar/selection-action-bar.tsx";

import type { SelectionAction } from "#components/selection-action-bar/selection-action-bar.tsx";
import type { PropsWithChildren } from "react";

interface CardSelectionContextValue {
  selectedItems: Set<string>;
  toggleItemSelection: (id: string) => void;
  clearSelection: () => void;
}

const CardSelectionContext = createContext<
  CardSelectionContextValue | undefined
>(undefined);

interface CardSelectionProviderProps {
  actions: (context: {
    selectedItems: Set<string>;
    clearSelection: () => void;
  }) => [SelectionAction, ...SelectionAction[]];
}

export function CardSelectionProvider({
  children,
  actions,
}: PropsWithChildren<CardSelectionProviderProps>) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  function toggleItemSelection(id: string) {
    startTransition(() => {
      setSelectedItems((prev) => {
        const newSet = new Set(prev);

        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }

        return newSet;
      });
    });
  }

  function clearSelection() {
    setSelectedItems(new Set());
  }

  const contextValue = useMemo<CardSelectionContextValue>(
    () => ({
      selectedItems,
      toggleItemSelection,
      clearSelection,
    }),
    [selectedItems],
  );

  // Build actions with context
  const actionItems = useMemo(
    () => actions({ selectedItems, clearSelection }),
    [actions, selectedItems],
  );

  return (
    <CardSelectionContext.Provider value={contextValue}>
      {children}
      {selectedItems.size > 0 && (
        <SelectionActionBar
          count={selectedItems.size}
          actions={actionItems}
          selectedIds={Array.from(selectedItems)}
          // disabled={actionInProgress}
          onClear={() => {
            clearSelection();
          }}
        />
      )}
    </CardSelectionContext.Provider>
  );
}

export function useCardSelection() {
  return use(CardSelectionContext);
}
