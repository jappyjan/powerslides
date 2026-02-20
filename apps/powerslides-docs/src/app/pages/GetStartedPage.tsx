import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, Text } from '@jappyjan/even-realities-ui';
import { Breadcrumb } from '../../components/Breadcrumb';
import { StepCard } from '../../components/StepCard';

export function GetStartedPage() {
  return (
    <div className="space-y-10">
      <Breadcrumb
        items={[
          { label: 'Home', to: '/' },
          { label: 'Get Started' },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Get Started</h1>
        <Text variant="body-2" className="text-slate-600 mt-2">
          Three simple steps to present with PowerSlides.
        </Text>
      </div>

      <Card className="border-[var(--docs-border)] shadow-sm">
        <CardHeader>
          <Text variant="title-2" className="text-slate-800">
            Prerequisites
          </Text>
        </CardHeader>
        <CardContent className="space-y-2 text-slate-600">
          <Text variant="body-2">• Even Hub app with G2</Text>
          <Text variant="body-2">• Chrome browser</Text>
          <Text variant="body-2">• Google account</Text>
        </CardContent>
      </Card>

      <StepCard step={1} title="Get the extension">
        <Text variant="body-2">
          Install the PowerSlides extension from the{' '}
          <Link to="/extension" className="text-[var(--docs-primary)] hover:underline font-medium">
            Chrome Web Store
          </Link>
          .
        </Text>
      </StepCard>

      <StepCard step={2} title="Get the Even Hub app">
        <Text variant="body-2">
          Install the PowerSlides app from Even Hub on your G2.
        </Text>
      </StepCard>

      <StepCard step={3} title="Launch and connect">
        <Text variant="body-2">
          Open your Google Slides deck and start a presentation. Click the
          extension to start a session and get a pairing code. Enter the code in
          the Even Hub app to connect. You're ready — use your wrist to advance
          slides and read speaker notes.
        </Text>
        <Text variant="body-2" className="mt-4">
          See{' '}
          <Link to="/connecting" className="text-[var(--docs-primary)] hover:underline font-medium">
            Connecting
          </Link>{' '}
          for pairing details and troubleshooting.
        </Text>
      </StepCard>
    </div>
  );
}
