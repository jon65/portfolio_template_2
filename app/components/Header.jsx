'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCart } from '../context/CartContext'
import './Header.css'

function Header() {
  const { getCartCount } = useCart()
  const cartCount = getCartCount()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  // Close mobile menu when clicking outside or on route change
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuOpen && !event.target.closest('header')) {
        setMobileMenuOpen(false)
      }
    }

    if (mobileMenuOpen) {
      document.addEventListener('click', handleClickOutside)
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  return (
    <header>
      <nav>
        <div className="nav-left">
          <Link href="/#collection">Collection</Link>
          <div className="dropdown">
            <Link href="/#essentials">Essentials</Link>
            <div className="dropdown-content">
              <div className="dropdown-column">
                <h3>New Releases</h3>
                <Link href="/#latest-drops">Latest Drops</Link>
                <Link href="/#seasonal">Seasonal</Link>
                <Link href="/#limited-edition">Limited Edition</Link>
              </div>
              <div className="dropdown-column">
                <h3>Shop Mens</h3>
                <Link href="/#mens-tops">Tops</Link>
                <Link href="/#mens-bottoms">Bottoms</Link>
                <Link href="/#mens-outerwear">Outerwear</Link>
                <Link href="/#mens-accessories">Accessories</Link>
              </div>
              <div className="dropdown-column">
                <h3>Shop Womens</h3>
                <Link href="/#womens-tops">Tops</Link>
                <Link href="/#womens-bottoms">Bottoms</Link>
                <Link href="/#womens-dresses">Dresses</Link>
                <Link href="/#womens-accessories">Accessories</Link>
              </div>
            </div>
          </div>
          <Link href="/#athletics">Athletics</Link>
        </div>
        
        <Link href="/" className="logo">Your Brand</Link>
        
        <div className="nav-right">
          <Link href="/#search">Search</Link>
          <Link href="/#account">Account</Link>
          <Link href="/cart" className="cart-link">
            Bag
            {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
          </Link>
        </div>

        <button 
          className="mobile-menu-toggle"
          onClick={toggleMobileMenu}
          aria-label="Toggle mobile menu"
          aria-expanded={mobileMenuOpen}
        >
          <span className={mobileMenuOpen ? 'hamburger open' : 'hamburger'}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
      </nav>

      <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        <Link href="/#collection" onClick={() => setMobileMenuOpen(false)}>Collection</Link>
        <Link href="/#essentials" onClick={() => setMobileMenuOpen(false)}>Essentials</Link>
        <Link href="/#athletics" onClick={() => setMobileMenuOpen(false)}>Athletics</Link>
        <Link href="/#search" onClick={() => setMobileMenuOpen(false)}>Search</Link>
        <Link href="/#account" onClick={() => setMobileMenuOpen(false)}>Account</Link>
        <Link href="/cart" onClick={() => setMobileMenuOpen(false)} className="mobile-cart-link">
          Bag {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
        </Link>
      </div>
    </header>
  )
}

export default Header

