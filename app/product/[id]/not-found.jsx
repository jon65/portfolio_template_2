import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ 
      padding: '120px 60px', 
      textAlign: 'center',
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>404</h1>
      <h2 style={{ fontSize: '24px', marginBottom: '30px' }}>Product Not Found</h2>
      <Link 
        href="/" 
        style={{
          display: 'inline-block',
          padding: '18px 60px',
          background: '#1a1a1a',
          color: 'white',
          border: '2px solid #1a1a1a',
          textDecoration: 'none',
          fontSize: '12px',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          transition: 'all 0.3s'
        }}
      >
        Return to Shop
      </Link>
    </div>
  )
}



