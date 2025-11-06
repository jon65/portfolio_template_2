import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      textAlign: 'center',
      fontFamily: 'Inter, sans-serif'
    }}>
      <h1 style={{ fontSize: '72px', marginBottom: '20px', color: '#1a1a1a', fontWeight: '400' }}>
        404
      </h1>
      <h2 style={{ fontSize: '32px', marginBottom: '15px', color: '#1a1a1a', fontWeight: '400' }}>
        Page Not Found
      </h2>
      <p style={{ fontSize: '18px', marginBottom: '30px', color: '#666' }}>
        The page you're looking for doesn't exist.
      </p>
      <Link
        href="/"
        style={{
          padding: '12px 24px',
          backgroundColor: '#1a1a1a',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          textDecoration: 'none',
          fontSize: '16px',
          fontWeight: '500',
          display: 'inline-block'
        }}
      >
        Go back home
      </Link>
    </div>
  )
}

