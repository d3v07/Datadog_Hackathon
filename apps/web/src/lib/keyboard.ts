import { useEffect, useRef } from "react";

type ModifierKey = "Meta" | "Control" | "Shift" | "Alt";

interface ParsedCombo {
  modifiers: ModifierKey[];
  key: string;
}

function parseCombo(combo: string): ParsedCombo {
  const parts = combo.split("+");
  const key: string = parts[parts.length - 1] ?? combo;
  const modifiers = parts.slice(0, -1) as ModifierKey[];
  return { modifiers, key };
}

function matchesCombo(e: KeyboardEvent, parsed: ParsedCombo): boolean {
  const { modifiers, key } = parsed;
  if (e.key.toLowerCase() !== key.toLowerCase()) return false;
  if (modifiers.includes("Meta") && !e.metaKey) return false;
  if (modifiers.includes("Control") && !e.ctrlKey) return false;
  if (modifiers.includes("Shift") && !e.shiftKey) return false;
  if (modifiers.includes("Alt") && !e.altKey) return false;
  return true;
}

function isTextTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useGlobalShortcut(combo: string, handler: () => void): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const parsed = useRef(parseCombo(combo));
  parsed.current = parseCombo(combo);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (isTextTarget(e.target)) return;
      if (matchesCombo(e, parsed.current)) {
        e.preventDefault();
        handlerRef.current();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

export function useKeyOnce(key: string, handler: () => void): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (isTextTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault();
        handlerRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [key]);
}
