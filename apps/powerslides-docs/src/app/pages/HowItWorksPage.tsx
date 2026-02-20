import { Card, CardContent, CardHeader, Text } from '@jappyjan/even-realities-ui';
import { Breadcrumb } from '../../components/Breadcrumb';

export function HowItWorksPage() {
  return (
    <div className="space-y-10">
      <Breadcrumb
        items={[
          { label: 'Home', to: '/' },
          { label: 'How It Works' },
        ]}
      />
      <div>
        <h1 className="text-3xl font-bold text-slate-900">How It Works</h1>
        <Text variant="body-2" className="text-slate-600 mt-2">
          PowerSlides connects your slides to your wrist.
        </Text>
      </div>

      <Card className="border-[var(--docs-border)] shadow-sm">
        <CardHeader>
          <Text variant="title-2" className="text-slate-800">
            The flow
          </Text>
        </CardHeader>
        <CardContent className="space-y-4 text-slate-600">
          <Text variant="body-2">
            The Chrome extension runs on Google Slides and reads your slide state
            — which slide you're on, your speaker notes, and the total number of
            slides. It connects to the Even Hub app via a pairing code.
          </Text>
          <Text variant="body-2">
            Once paired, your speaker notes appear on your wrist. Tap Next or
            Back in the Even Hub app to advance or go back in your deck. Present
            hands-free.
          </Text>
          <div className="pt-4 flex items-center justify-center gap-3 text-sm text-[var(--docs-muted)] font-mono">
            <span>Extension</span>
            <span>←→</span>
            <span>Even Hub</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
