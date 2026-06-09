import "./AppLoading.css";

interface AppLoadingProps {
  label?: string;
}

export function AppLoading({ label = "Carregando..." }: AppLoadingProps) {
  return (
    <div className="app-loading" role="status" aria-live="polite">
      <div className="app-loading-card">
        <div className="app-loading-spinner" aria-hidden="true" />
        <p className="app-loading-label">{label}</p>
      </div>
    </div>
  );
}
