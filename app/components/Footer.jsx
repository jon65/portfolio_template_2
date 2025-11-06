import React from 'react'
import './Footer.css'

function Footer() {
  return (
    <footer>
      <div className="footer-content">
        <div className="footer-column">
          <h4>Shop</h4>
          <a href="#new-arrivals">New Arrivals</a>
          <a href="#mens">Mens</a>
          <a href="#womens">Womens</a>
          <a href="#accessories">Accessories</a>
        </div>
        
        <div className="footer-column">
          <h4>About</h4>
          <a href="#our-story">Our Story</a>
          <a href="#sustainability">Sustainability</a>
          <a href="#careers">Careers</a>
          <a href="#press">Press</a>
        </div>
        
        <div className="footer-column">
          <h4>Support</h4>
          <a href="#contact">Contact Us</a>
          <a href="#shipping">Shipping</a>
          <a href="#returns">Returns</a>
          <a href="#size-guide">Size Guide</a>
        </div>
        
        <div className="footer-column">
          <h4>Connect</h4>
          <a href="#instagram">Instagram</a>
          <a href="#twitter">Twitter</a>
          <a href="#facebook">Facebook</a>
          <a href="#newsletter">Newsletter</a>
        </div>
      </div>
      
      <div className="footer-bottom">
        © 2025 Your Brand. All Rights Reserved.
      </div>
    </footer>
  )
}

export default Footer

