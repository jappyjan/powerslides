import { Text } from "@jappyjan/even-realities-ui";

interface Props {
    logLines: string[];
}

export function Log(props: Props) {
    const { logLines } = props;

    return (<>
        {
            logLines.map((line, index) => (
                <Text key={index} variant="detail" className="block">
                    {line}
                </Text>
            ))
        }
    </>
    );
}