import { useEffect, useState } from 'react';
import { dateKey } from '../domain/date';

export function useToday(): string {
  const [today, setToday] = useState(() => dateKey(new Date()));
  useEffect(() => {
    const tick = () => setToday(dateKey(new Date()));
    const id = setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  return today;
}
