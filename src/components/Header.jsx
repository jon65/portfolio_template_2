import React from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import './Header.css'

function Header() {
  const { getCartCount } = useCart()
  const cartCount = getCartCount()

  return (
    <header>
      <nav>
        <div className="nav-left">
          <Link to="/#collection">Collection</Link>
          <div className="dropdown">
            <Link to="/#essentials">Essentials</Link>
            <div className="dropdown-content">
              <div className="dropdown-column">
                <h3>New Releases</h3>
                <Link to="/#latest-drops">Latest Drops</Link>
                <Link to="/#seasonal">Seasonal</Link>
                <Link to="/#limited-edition">Limited Edition</Link>
              </div>
              <div className="dropdown-column">
                <h3>Shop Mens</h3>
                <Link to="/#mens-tops">Tops</Link>
                <Link to="/#mens-bottoms">Bottoms</Link>
                <Link to="/#mens-outerwear">Outerwear</Link>
                <Link to="/#mens-accessories">Accessories</Link>
              </div>
              <div className="dropdown-column">
                <h3>Shop Womens</h3>
                <Link to="/#womens-tops">Tops</Link>
                <Link to="/#womens-bottoms">Bottoms</Link>
                <Link to="/#womens-dresses">Dresses</Link>
                <Link to="/#womens-accessories">Accessories</Link>
              </div>
            </div>
          </div>
          <Link to="/#athletics">Athletics</Link>
        </div>
        
        <Link to="/" className="logo">Your Brand</Link>
        
        <div className="nav-right">
          <Link to="/#search">Search</Link>
          <Link to="/#account">Account</Link>
          <Link to="/cart" className="cart-link">
            Bag
            {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
          </Link>
        </div>
      </nav>
    </header>
  )
}

export default Header

