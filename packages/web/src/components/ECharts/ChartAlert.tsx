export interface ChartAlertProps {
  variant: 'error' | 'warning';
  title: string;
  detail?: string;
  rawJson?: string;
}

export function ChartAlert({
  variant,
  title,
  detail,
  rawJson,
}: ChartAlertProps) {
  const isError = variant === 'error';
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`rounded-lg border p-4 ${isError ? 'border-red-300 bg-red-50' : 'border-yellow-300 bg-yellow-50'}`}>
      <p
        className={`font-semibold ${isError ? 'text-red-700' : 'text-yellow-700'}`}>
        {title}
      </p>
      {detail && <p className="text-sm text-gray-600">{detail}</p>}
      {rawJson && (
        <pre className="mt-2 overflow-auto text-xs text-gray-600">
          {rawJson}
        </pre>
      )}
    </div>
  );
}
