import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import './LoadingContext.css';

interface LoadingState {
  active: boolean;
  message: string;
}

interface LoadingContextType {
  isLoading: boolean;
  loadingMessage: string;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    active: false,
    message: 'Loading...',
  });

  const showLoading = useCallback((message = 'Loading...') => {
    setLoadingState({ active: true, message });
  }, []);

  const hideLoading = useCallback(() => {
    setLoadingState({ active: false, message: '' });
  }, []);

  return (
    <LoadingContext.Provider
      value={{
        isLoading: loadingState.active,
        loadingMessage: loadingState.message,
        showLoading,
        hideLoading,
      }}
    >
      {children}
      {loadingState.active && <LoadingOverlay message={loadingState.message} />}
    </LoadingContext.Provider>
  );
}

export function useLoading(): LoadingContextType {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

interface LoadingOverlayProps {
  message: string;
}

function LoadingOverlay({ message }: LoadingOverlayProps) {
  // Windows Phone style: flying dots along the top, the message in lowercase.
  return (
    <div className="loading-overlay" role="status" aria-live="polite">
      <div className="loading-content">
        <div className="loading-dots" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} style={{ animationDelay: `${i * 0.12}s` }} />
          ))}
        </div>
        <div className="loading-message">{message.replace(/\.\.\.$|…$/, '').toLowerCase()}…</div>
      </div>
    </div>
  );
}

export default LoadingContext;
