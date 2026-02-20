import { CopyIcon, IconButton, Text } from "@jappyjan/even-realities-ui";
import { useCallback, useState } from "react";
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
        <Text variant="title-2">Logs</Text>
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
            <IconButton
              aria-label="Copy logs"
              onClick={copyLogsToClipboard}
            >
              <CopyIcon aria-hidden size={16} />
            </IconButton>
            {copyFeedback && (
              <Text variant="detail" className="text-green-600">
                Copied
              </Text>
            )}
          </div>
          {logLines.map((line) => (
            <Text key={line.id} variant="detail" className="block">
              {line.message}
            </Text>
          ))}
        </div>
      )}
    </div>
  );
}
