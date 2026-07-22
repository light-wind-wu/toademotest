'use client';

interface FieldRequiredProps {
  show: boolean;
  message?: string;
}

export default function FieldRequired({ show, message = 'This field is required.' }: FieldRequiredProps) {
  if (!show) return null;
  return (
    <div className="min-h-4">
      <p className="text-xs leading-relaxed text-danger">{message}</p>
    </div>
  );
}
