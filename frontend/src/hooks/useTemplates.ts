import { useState, useEffect } from "react";
import type { TaskTemplate } from "../types";

const STORAGE_KEY = "taskkanri_templates";

export function useTemplates() {
  const [templates, setTemplates] = useState<TaskTemplate[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  }, [templates]);

  const addTemplate = (tpl: Omit<TaskTemplate, "id">) => {
    setTemplates((prev) => [
      ...prev,
      { ...tpl, id: `tpl_${Date.now()}` },
    ]);
  };

  const removeTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  return { templates, addTemplate, removeTemplate };
}
