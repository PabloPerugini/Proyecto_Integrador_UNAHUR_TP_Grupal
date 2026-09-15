import { useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';

export default function Favicon() {
  const { theme } = useTheme();

  useEffect(() => {
    const link = document.getElementById('app-icon') as HTMLLinkElement | null;
    if (link) {
      link.href = theme === 'dark' ? '/icon-dark.png' : '/icon-light.png';
    }
  }, [theme]);

  return null;
}