import { useState, useCallback } from "react";

export function useClipboard(timeout = 2000) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const copy = useCallback(
    (text: string) => {
      if (!text) return;
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopied(true);
          setError(null);
          setTimeout(() => setCopied(false), timeout);
        })
        .catch((err) => {
          setError(err);
          setCopied(false);
          setTimeout(() => setError(null), timeout);
        });
    },
    [timeout],
  );

  return { copy, copied, error };
}
