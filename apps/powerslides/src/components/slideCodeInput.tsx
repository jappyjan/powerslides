import { useState } from "react";
import { formatPairingCode } from "@jappyjan/powerslides-shared";
import { Button, Card, CardContent, CardFooter, CardHeader, Input, Text } from "@jappyjan/even-realities-ui";
import { useSlidesContext } from "../slidesContext";


export function SlideCodeInput() {
    const [nextPairingCode, setNextPairingCode] = useState<string>("");

    const { connect, isConnecting } = useSlidesContext();

    const handleConnect = async () => {
        if (!nextPairingCode) { return; }

        await connect(nextPairingCode);
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
            </CardContent >
            <CardFooter>
                <Button onClick={handleConnect} variant="primary" disabled={isConnecting}>
                    {isConnecting ? "Connecting..." : "Connect"}
                    Connect
                </Button>
            </CardFooter>
        </Card >
    </div >);
}