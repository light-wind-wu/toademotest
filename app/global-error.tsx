'use client';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en" data-zone="d-experience" data-mode="light">
      <body style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: 8 }}>Something went wrong</h2>
          <button onClick={reset} style={{ padding: '8px 16px', cursor: 'pointer' }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
