import { useEffect } from 'react';

export default function Favicon() {
  useEffect(() => {
    const link = document.getElementById('app-icon') as HTMLLinkElement | null;
    if (link) {
      link.href = '/favicon.png';
    }
  }, []);

  return null;
}
