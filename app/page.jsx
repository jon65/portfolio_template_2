import Hero from './components/Hero'
import ProductSection from './components/ProductSection'
import Footer from './components/Footer'

// Server Component - Home page with SSR
export default async function Home() {
  return (
    <>
      <Hero />
      <ProductSection />
      <Footer />
    </>
  )
}

