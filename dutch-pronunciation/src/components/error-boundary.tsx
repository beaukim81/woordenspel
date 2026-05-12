import { Component, ReactNode } from "react";

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  handleReset = () => {
    this.setState({ error: null });
    // Navigate home via full page reload so all state resets cleanly
    window.location.href = import.meta.env.BASE_URL || "/";
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen min-h-[100dvh] w-full flex flex-col items-center justify-center bg-background px-6 text-center">
          <div className="text-7xl mb-6 select-none">😬</div>
          <div className="font-black text-2xl text-white mb-2">Oeps!</div>
          <div className="text-white/50 font-bold text-base mb-8">
            Er ging iets mis. Geen zorgen!
          </div>
          <button
            onClick={this.handleReset}
            className="px-8 py-4 rounded-3xl bg-gradient-to-br from-yellow-400 to-amber-500
              text-gray-900 font-black text-xl uppercase tracking-wide shadow-xl border-b-4 border-amber-700"
          >
            Opnieuw starten
          </button>
          {import.meta.env.DEV && (
            <pre className="mt-8 text-left text-xs text-red-400/70 max-w-sm overflow-auto bg-white/5 p-3 rounded-xl">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
