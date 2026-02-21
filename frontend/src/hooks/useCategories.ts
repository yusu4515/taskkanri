import { useState, useCallback } from "react";

const STORAGE_KEY = "taskkanri_categories";

const DEFAULT_CATEGORIES = ["法務", "経理", "総務", "人事", "その他"];

export function useCategories() {
  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  });

  const addCategory = useCallback((label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    setCategories((prev) => {
      if (prev.includes(trimmed)) return prev;
      const updated = [...prev, trimmed];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeCategory = useCallback((label: string) => {
    setCategories((prev) => {
      const updated = prev.filter((c) => c !== label);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return { categories, addCategory, removeCategory };
}
