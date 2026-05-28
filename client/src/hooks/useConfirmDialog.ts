import { useState, useCallback } from 'react';

export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [target, setTarget] = useState<string | number | null>(null);

  const open = useCallback((id: string | number | null = null) => {
    setTarget(id);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setTarget(null);
  }, []);

  return { isOpen, target, open, close };
}
