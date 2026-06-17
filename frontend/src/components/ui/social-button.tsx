import { cn } from '#/lib/utils';
import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react';
import { Button } from './button';

interface SocialButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  provider: string;
  prefix?: string;
}

export const SocialButton = forwardRef<HTMLButtonElement, SocialButtonProps>(
  ({ icon, provider, className, ...props }, ref) => {
    return (
		<Button
			variant="outline"
			size="lg"
			className={cn('cursor-pointer', className)}
			ref={ref}
			{...props}
		>
			{icon}
			{props.prefix && `${props.prefix} `}
			{provider}
		</Button>
    );
  }
);

SocialButton.displayName = 'SocialButton';