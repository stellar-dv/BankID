import { RequestLogger } from './components/RequestLogger';
import { Toaster } from './components/ui/toaster';
import { ToastProvider } from './components/ui/toast';
import { ThemeProvider } from './hooks/use-theme.tsx';
import { ThemeToggle } from './components/features/ThemeToggle';

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="bankid-ui-theme">
      <ToastProvider>
        <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 text-white">
          <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold">BankID Monitor</h1>
              </div>
              <div className="flex items-center space-x-4">
                <ThemeToggle />
              </div>
            </div>
          </header>
          <main className="container mx-auto flex-1 p-4">
            <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
              <RequestLogger />
            </div>
          </main>
          <Toaster />
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
}
