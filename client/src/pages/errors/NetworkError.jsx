import { WifiOff } from "lucide-react";

const NetworkError = () => {
  return (
    <div className="min-h-screen bg-(--secondary-bg) flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-(--primary-bg) border border-[rgb(var(--primary-accent-rgb)/0.08)] rounded-3xl shadow-sm p-8">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-(--secondary-bg) text-(--secondary-accent)">
            <WifiOff size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-(--primary-text)">You’re offline</h1>
            <p className="text-sm text-(--primary-accent) opacity-70 mt-1">
              Please check your internet connection and try again.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <img
            src="/undraw_no-signal_nqfa.svg"
            alt="No signal illustration"
            loading="lazy"
            className="w-full max-w-md mx-auto"
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-(--primary-accent) text-(--primary-bg) font-bold hover:bg-(--primary-text) transition-colors"
          >
            Retry
          </button>

          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-4 py-2 rounded-xl border border-[rgb(var(--primary-accent-rgb)/0.15)] bg-(--primary-bg) text-(--primary-accent) font-bold hover:bg-(--secondary-bg) transition-colors"
          >
            Go Back
          </button>
        </div>

        <div className="mt-6 text-xs text-(--primary-accent) opacity-60">
          Tip: If you’re on mobile data, ensure MarkMe has internet access.
        </div>
      </div>
    </div>
  );
};

export default NetworkError;
