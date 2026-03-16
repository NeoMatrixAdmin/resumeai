import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <SignUp />
    </div>
  );
}