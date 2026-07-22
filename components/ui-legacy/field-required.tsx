'use client';

interface FieldRequiredProps {
  show: boolean;
  message?: string;
}

export default function FieldRequired({ show, message = 'This field is required.' }: FieldRequiredProps) {
  return (
    <div className="min-h-4">
      {show ? <p className="text-xs leading-relaxed text-danger">{message}</p> : null}
    </div>
  );
}
