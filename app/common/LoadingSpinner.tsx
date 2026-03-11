type LoadingSpinnerProps = {
    message: string;
};

export default function LoadingSpinner({ message }: LoadingSpinnerProps) {
    return (
        <div className="flex flex-col items-center justify-center gap-3" role="status" aria-live="polite">
            <div
                className="h-10 w-10 animate-spin rounded-full border-4 border-slate-600 border-t-emerald-500"
                aria-hidden="true"
            />
            <p className="text-sm font-medium text-slate-300">{message}</p>
        </div>
    );
}
