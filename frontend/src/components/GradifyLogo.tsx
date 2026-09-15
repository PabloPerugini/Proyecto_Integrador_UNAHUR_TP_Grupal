import { useTheme } from '../hooks/useTheme';

interface GradifyLogoProps {
  size?: number;
  className?: string;
}

export default function GradifyLogo({ size = 34, className = '' }: GradifyLogoProps) {
  const { theme } = useTheme();
  return (
    <img
      src={theme === 'dark' ? '/icon-dark.png' : '/icon-light.png'}
      alt="Gradify"
      width={size}
      height={size}
      draggable={false}
      className={className}
    />
  );
}