import { useEffect, useState } from "react";
import { formatPairingCode, parsePairingCodeResult } from "@jappyjan/powerslides-shared";
import type { PairingPayload } from "@jappyjan/powerslides-shared";
import { Button, Card, CardContent, CardFooter, CardHeader, Input, Text } from "@jappyjan/even-realities-ui";

interface Props {
    pairing: PairingPayload | null;
    setPairing: (pairing: PairingPayload | null) => void;
}

export function SlideCodeInput(props: Props) {
    const { pairing, setPairing } = props;

    const [nextPairingCode, setNextPairingCode] = useState<string>(
        pairing ? formatPairingCode(pairing.slideId) : ""
    );
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (pairing) {
            setNextPairingCode(formatPairingCode(pairing.slideId));
        }
    }, [pairing]);

    const handleConnect = () => {
        const result = parsePairingCodeResult(nextPairingCode);
        if (!result.payload) {
            if (result.error === "expired") {
                setError("Pairing code expired. Generate a new code in the extension.");
                return;
            }
            setError("Invalid pairing code. Enter the 12-character code.");
            return;
        }
        setError(null);
        setPairing(result.payload);
    };

    return (<div className="flex flex-col gap-layout-section">
        <Card>
            <CardHeader>
                Manual pairing code
            </CardHeader>
            <CardContent>
                <Input
                    id="slide-code"
                    value={nextPairingCode}
                    onChange={(e) => setNextPairingCode(formatPairingCode(e.target.value))}
                    placeholder="ABCD-EFGH-IJKL"
                />
                <Text variant="body-2">
                    Enter the code shown in the slide control extension.
                </Text>
                {error && (
                    <Text variant="detail" className="text-red-400">
                        {error}
                    </Text>
                )}
            </CardContent >
            <CardFooter>
                <Button onClick={handleConnect} variant="primary">
                    Connect
                </Button>
            </CardFooter>
        </Card >
    </div >);
}