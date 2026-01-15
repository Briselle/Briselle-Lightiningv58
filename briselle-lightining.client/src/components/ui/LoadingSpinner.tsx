import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: number;
}

function LoadingSpinner({ size = 24 }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <Loader2 size={size} className="animate-spin text-primary" />
    </div>
  );
}

export default LoadingSpinner;