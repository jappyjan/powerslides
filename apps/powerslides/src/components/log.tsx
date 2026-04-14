import { useCallback, useState } from "react";
import { Button } from "even-toolkit/web";
import { IcCopy } from "even-toolkit/web/icons/svg-icons";
import { useLogger } from "../hooks/useLogger";

export function Log() {
  const { logLines } = useLogger();
  const [isExpanded, setIsExpanded] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const copyLogsToClipboard = useCallback(() => {
    navigator.clipboard.writeText(
      logLines.map((line) => line.message).join("\n")
    );
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  }, [logLines]);

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 py-2 text-left"
        aria-expanded={isExpanded}
      >
        <span className="text-large-title">Logs</span>
        <span
          className={`inline-block transition-transform ${isExpanded ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▼
        </span>
      </button>

      {isExpanded && (
        <div className="max-h-[400px] overflow-y-auto">
          <div className="mb-2 flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Copy logs"
              onClick={copyLogsToClipboard}
            >
              <IcCopy width={16} height={16} aria-hidden />
            </Button>
            {copyFeedback && (
              <span
                className="text-detail"
                style={{ color: "var(--color-positive)" }}
              >
                Copied
              </span>
            )}
          </div>
          {logLines.map((line) => (
            <span key={line.id} className="block text-detail">
              {line.message}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
