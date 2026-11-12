import { createContext, useContext } from 'react';

export interface QuickAddPrefill {
  amount?: number;
  note?: string;
  source?: 'scan';
}

export const QuickAddContext = createContext<{ open: (prefill?: QuickAddPrefill) => void }>({
  open: () => undefined,
});

export function useQuickAdd() {
  return useContext(QuickAddContext);
}
