import { Card, CardContent, CardHeader, Text } from '@jappyjan/even-realities-ui';
import { Breadcrumb } from '../../components/Breadcrumb';

export function ConnectingPage() {
  return (
    <div className="space-y-10">
      <Breadcrumb
        items={[
          { label: 'Home', to: '/' },
          { label: 'Connecting' },
        ]}
      />
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Connecting</h1>
        <Text variant="body-2" className="text-slate-600 mt-2">
          How to pair the extension with your Even Hub app.
        </Text>
      </div>

      <Card className="border-[var(--docs-border)] shadow-sm">
        <CardHeader>
          <Text variant="title-2" className="text-slate-800">
            Pairing flow
          </Text>
        </CardHeader>
        <CardContent className="space-y-4 text-slate-600">
          <Text variant="body-2">
            1. Open your Google Slides deck and start a presentation.
          </Text>
          <Text variant="body-2">
            2. Click the PowerSlides extension and start a session.
          </Text>
          <Text variant="body-2">
            3. The extension shows a 12-character code (e.g. ABCD-EFGH-IJKL).
          </Text>
          <Text variant="body-2">
            4. Open the PowerSlides app in Even Hub and enter the code.
          </Text>
          <Text variant="body-2">
            5. Tap Connect. You're paired — advance slides and read notes from
            your wrist.
          </Text>
        </CardContent>
      </Card>

      <Card className="border-[var(--docs-border)] shadow-sm">
        <CardHeader>
          <Text variant="title-2" className="text-slate-800">
            Code format
          </Text>
        </CardHeader>
        <CardContent className="text-slate-600">
          <Text variant="body-2">
            The pairing code is 12 characters, often displayed as ABCD-EFGH-IJKL.
            You can enter it with or without dashes.
          </Text>
        </CardContent>
      </Card>

      <Card className="border-[var(--docs-border)] shadow-sm">
        <CardHeader>
          <Text variant="title-2" className="text-slate-800">
            Troubleshooting
          </Text>
        </CardHeader>
        <CardContent className="space-y-6 text-slate-600">
          <div>
            <Text variant="body-2" className="font-semibold text-slate-800">
              Code expired
            </Text>
            <Text variant="detail" className="text-slate-600 mt-1">
              Get a new code from the extension. Start a new session if needed.
            </Text>
          </div>
          <div>
            <Text variant="body-2" className="font-semibold text-slate-800">
              Invalid code
            </Text>
            <Text variant="detail" className="text-slate-600 mt-1">
              Use the 12-character format. Check for typos.
            </Text>
          </div>
          <div>
            <Text variant="body-2" className="font-semibold text-slate-800">
              Connection failed
            </Text>
            <Text variant="detail" className="text-slate-600 mt-1">
              Make sure you're connected to the internet. Try starting a new
              session in the extension and entering the code again.
            </Text>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
