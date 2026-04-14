import { useState } from "react";
import { formatPairingCode } from "@jappyjan/powerslides-shared";
import { Button, Card, Input } from "even-toolkit/web";
import { useSlidesContext } from "../slidesContext";

const ERROR_MESSAGES: Record<string, string> = {
  expired: "Code expired. Get a new one from the extension.",
  invalid: "Invalid code. Use the 12-character format.",
  default: "Connection failed. Check the code and try again.",
};

function getErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("expired")) return ERROR_MESSAGES.expired;
  if (message.includes("Invalid Pairing Code")) return ERROR_MESSAGES.default;
  if (message.includes("Invalid pairing code")) return ERROR_MESSAGES.invalid;
  return ERROR_MESSAGES.default;
}

export function SlideCodeInput() {
  const [nextPairingCode, setNextPairingCode] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const { connect, isConnecting } = useSlidesContext();

  const handleConnect = async () => {
    if (!nextPairingCode) return;

    setError(null);
    try {
      await connect(nextPairingCode);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card padding="none">
        <div
          className="px-4 py-3 text-medium-title"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          Pairing code
        </div>
        <div className="flex flex-col gap-4 px-4 py-4">
          <Input
            id="slide-code"
            value={nextPairingCode}
            onChange={(e) => setNextPairingCode(formatPairingCode(e.target.value))}
            placeholder="ABCD-EFGH-IJKL"
            className="font-mono"
          />
          <p className="text-detail" style={{ color: "var(--color-text-dim)" }}>
            Get the code from the extension popup.
          </p>
        </div>
        <div
          className="px-4 py-3"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <Button
            onClick={handleConnect}
            variant="highlight"
            disabled={isConnecting}
          >
            {isConnecting ? "Connecting…" : "Connect"}
          </Button>
        </div>
      </Card>

      {error && (
        <div
          className="rounded-md px-4 py-3 text-detail"
          role="alert"
          style={{
            border: "1px solid var(--color-negative)",
            backgroundColor: "var(--color-negative-alpha)",
            color: "var(--color-negative)",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
