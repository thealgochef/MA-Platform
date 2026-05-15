"use client";

import { useEffect, useState } from "react";

export function useAutoDismissFlag(initiallyVisible: boolean, delayMs = 4000) {
  const [isVisible, setIsVisible] = useState(initiallyVisible);

  useEffect(() => {
    setIsVisible(initiallyVisible);

    if (!initiallyVisible) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsVisible(false);
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [initiallyVisible, delayMs]);

  return { isVisible, setIsVisible };
}
