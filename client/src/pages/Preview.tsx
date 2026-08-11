// Preview bypass — sets auth in localStorage and redirects to dashboard
// Used for screenshot capture only; not linked from the app
import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useDashboard } from '@/contexts/DashboardContext';

export default function Preview() {
  const { login } = useDashboard();
  const [, navigate] = useLocation();
  useEffect(() => {
    login('liz@thehumblevillage.org');
    navigate('/');
  }, []);
  return null;
}
