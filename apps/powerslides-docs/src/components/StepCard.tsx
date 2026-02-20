import { Card, CardContent, CardHeader, Text } from '@jappyjan/even-realities-ui';

type StepCardProps = {
  step: number;
  title: string;
  children: React.ReactNode;
};

export function StepCard({ step, title, children }: StepCardProps) {
  return (
    <Card className="border-[var(--docs-border)] shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--docs-primary)] text-white text-sm font-bold"
          aria-hidden
        >
          {step}
        </span>
        <Text variant="title-2" as="h2" className="text-slate-800">
          {title}
        </Text>
      </CardHeader>
      <CardContent className="text-slate-600">{children}</CardContent>
    </Card>
  );
}
