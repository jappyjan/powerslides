import { useState } from "react";
import { formatPairingCode } from "@jappyjan/powerslides-shared";
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Input,
  Text,
} from "@jappyjan/even-realities-ui";
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
      <Card>
        <CardHeader>Pairing code</CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Input
            id="slide-code"
            value={nextPairingCode}
            onChange={(e) => setNextPairingCode(formatPairingCode(e.target.value))}
            placeholder="ABCD-EFGH-IJKL"
            className="font-mono"
          />
          <Text variant="detail">
            Get the code from the extension popup.
          </Text>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleConnect}
            variant="primary"
            disabled={isConnecting}
          >
            {isConnecting ? "Connecting…" : "Connect"}
          </Button>
        </CardFooter>
      </Card>

      {error && (
        <div
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3"
          role="alert"
        >
          <Text variant="detail" className="text-red-700">
            {error}
          </Text>
        </div>
      )}
    </div>
  );
}
