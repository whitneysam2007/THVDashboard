import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type PasswordInputProps = React.ComponentProps<typeof Input> & {
  containerClassName?: string;
};

export function PasswordInput({ className, containerClassName, ...props }: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);
  const actionLabel = isVisible ? 'Hide password' : 'Show password';

  return (
    <div className={cn('relative', containerClassName)}>
      <Input
        {...props}
        type={isVisible ? 'text' : 'password'}
        className={cn('pr-10', className)}
      />
      <button
        type="button"
        aria-label={actionLabel}
        aria-pressed={isVisible}
        title={actionLabel}
        onMouseDown={event => event.preventDefault()}
        onClick={() => setIsVisible(visible => !visible)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-[oklch(0.52_0.022_65)] transition-colors hover:text-[oklch(0.22_0.018_55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.22_0.018_55)]"
      >
        {isVisible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
      </button>
    </div>
  );
}
