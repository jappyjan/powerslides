import { Card, CardContent, CardHeader, Text } from '@jappyjan/even-realities-ui';
import { Breadcrumb } from '../../components/Breadcrumb';

// Update with your Chrome Web Store listing URL when published
const CHROME_STORE_URL =
  'https://chromewebstore.google.com/detail/powerslides/lkacinimpogfdenkkipehipbmmlamfml';

export function ExtensionPage() {
  return (
    <div className="space-y-10">
      <Breadcrumb
        items={[
          { label: 'Home', to: '/' },
          { label: 'Extension' },
        ]}
      />
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Chrome Extension</h1>
        <Text variant="body-2" className="text-slate-600 mt-2">
          Get PowerSlides from the Chrome Web Store.
        </Text>
      </div>

      <Card className="border-[var(--docs-border)] shadow-sm">
        <CardHeader>
          <Text variant="title-2" className="text-slate-800">
            Install from Chrome Web Store
          </Text>
        </CardHeader>
        <CardContent className="space-y-4 text-slate-600">
          <Text variant="body-2">
            Install the PowerSlides extension to connect Google Slides with your
            Even Hub app.
          </Text>
          <a
            href={CHROME_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 bg-[var(--docs-primary)] text-white font-semibold rounded-lg hover:bg-[var(--docs-primary-hover)] transition-colors"
          >
            Get from Chrome Web Store →
          </a>
        </CardContent>
      </Card>

      <Card className="border-[var(--docs-border)] shadow-sm">
        <CardHeader>
          <Text variant="title-2" className="text-slate-800">
            What it does
          </Text>
        </CardHeader>
        <CardContent className="text-slate-600">
          <Text variant="body-2">
            The extension runs on Google Slides. It reads your slide state
            (current slide, speaker notes), generates a pairing code, and
            relays commands between the Even Hub app and your deck. Use your
            wrist to advance slides and read notes while presenting.
          </Text>
        </CardContent>
      </Card>

      <Card className="border-[var(--docs-border)] shadow-sm">
        <CardHeader>
          <Text variant="title-2" className="text-slate-800">
            Supported
          </Text>
        </CardHeader>
        <CardContent className="text-slate-600">
          <Text variant="body-2">
            PowerSlides works with Google Slides. Open a deck, start a
            presentation, and use the extension to pair with your Even Hub app.
          </Text>
        </CardContent>
      </Card>
    </div>
  );
}
