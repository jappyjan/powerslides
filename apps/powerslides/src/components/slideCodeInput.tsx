import { useEffect, useMemo, useState } from "react";
import { formatPairingCode } from "@jappyjan/powerslides-shared";
import { Button, Card, CardContent, CardFooter, CardHeader, Input, Text } from "@jappyjan/even-realities-ui";
import { useLogger } from "../hooks/useLogger";
import { EvenBetterElementSize, EvenBetterTextElement } from "@jappyjan/even-better-sdk";
import { useSlidesContext } from "../slidesContext";


export function SlideCodeInput() {
    const { info: logInfo } = useLogger();

    const [nextPairingCode, setNextPairingCode] = useState<string>("");

    const { connect, isConnecting, sdk } = useSlidesContext();

    const handleConnect = async () => {
        await connect(nextPairingCode);
    };

    const glassesPage = useMemo(() => sdk.createPage("connect"), [sdk]);
    const textElement = useMemo(() => {
        const element = glassesPage.addTextElement("Enter pairing code in APP");
        element.setSize((size) => {
            size.setWidth(EvenBetterElementSize.MAX_WIDTH);
            size.setHeight(EvenBetterElementSize.MAX_HEIGHT);
        });
        return element as EvenBetterTextElement;
    }, [glassesPage]);

    useEffect(() => {
        logInfo("slideCodeInput", `isConnectin: ${isConnecting}`);
        if (isConnecting) {
            textElement.setContent("Connecting...");
        } else {
            textElement.setContent("Enter pairing code in APP");
        }

        glassesPage.render();
    }, [textElement, glassesPage, isConnecting, logInfo])

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