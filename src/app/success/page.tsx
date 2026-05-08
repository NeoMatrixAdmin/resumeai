'use client';
import Link from 'next/link';

export default function SuccessPage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 480, padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 24, color: 'var(--accent)' }}>✦</div>
        <h1 className="font-display" style={{ fontSize: 36, color: 'var(--accent)', marginBottom: 16 }}>
          Welcome to Pro
        </h1>
        <p className="font-mono text-sm" style={{ color: 'var(--text-secondary)', marginBottom: 32, lineHeight: 1.7 }}>
          Your account has been upgraded. You now have unlimited optimizations and regenerations.
        </p>
        <Link href="/" style={{
          display: 'inline-block', padding: '12px 32px', borderRadius: 8,
          background: 'var(--accent)', color: '#0a0a0a',
          fontFamily: 'DM Mono', fontSize: 13, fontWeight: 500,
          textDecoration: 'none',
        }}>
          Start optimizing →
        </Link>
      </div>
    </div>
  );
}