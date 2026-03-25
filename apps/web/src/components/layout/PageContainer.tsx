import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <main
      className={cn(
        'mx-auto w-full max-w-6xl px-4 py-8',
        className,
      )}
    >
      {children}
    </main>
  );
}
