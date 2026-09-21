import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export function InstallPWAButton() {
  const { isInstallable, installPWA } = usePWAInstall();

  if (!isInstallable) return null;

  return (
    <Button
      onClick={installPWA}
      variant="outline"
      size="sm"
      title="Cài đặt ứng dụng ra màn hình chính"
      className="flex items-center gap-2 border-primary/20 text-primary hover:bg-primary/10 transition-colors"
    >
      <Download className="w-4 h-4" />
      <span className="hidden sm:inline">Cài đặt App</span>
    </Button>
  );
}
