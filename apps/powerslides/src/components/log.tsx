import { CopyIcon, IconButton, Text } from "@jappyjan/even-realities-ui";
import { useCallback } from "react";
import { useLogger } from "../hooks/useLogger";


export function Log() {
    const { logLines } = useLogger();

    const copyLogsToClipboard = useCallback(() => {
        navigator.clipboard.writeText(logLines.map((line) => line.message).join("\n"));

        alert("Logs copied to clipboard");
    }, [logLines]);

    return (<div className="max-h-[400px] overflow-y-auto mt-4">
        <Text variant="title-2">Logs</Text>
        <IconButton aria-label="Icon button" onClick={copyLogsToClipboard}>
            <CopyIcon
                aria-hidden
                size={16}
            />
        </IconButton>

        {
            logLines.map((line) => (
                <Text key={line.id} variant="detail" className="block">
                    {line.message}
                </Text>
            ))
        }
    </div>
    );
}