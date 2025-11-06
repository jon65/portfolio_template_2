// Centralized product data
export const products = [
  {
    id: 1,
    category: 'Essentials',
    name: 'Oversized Hoodie',
    price: '$185',
    priceValue: 185,
    description: 'Premium oversized hoodie crafted from the finest materials. Perfect for everyday comfort and style.',
    image: '/placeholder-hoodie.jpg'
  },
  {
    id: 2,
    category: 'Essentials',
    name: 'Relaxed Tee',
    price: '$95',
    priceValue: 95,
    description: 'Classic relaxed fit tee with premium cotton blend. Essential for any wardrobe.',
    image: '/placeholder-tee.jpg'
  },
  {
    id: 3,
    category: 'Essentials',
    name: 'Sweat Pants',
    price: '$165',
    priceValue: 165,
    description: 'Comfortable and stylish sweat pants designed for both lounging and active wear.',
    image: '/placeholder-pants.jpg'
  },
  {
    id: 4,
    category: 'Collection',
    name: 'Knit Sweater',
    price: '$345',
    priceValue: 345,
    description: 'Luxurious knit sweater with premium yarn. Perfect for layering in cooler weather.',
    image: '/placeholder-sweater.jpg'
  },
  {
    id: 5,
    category: 'Athletics',
    name: 'Track Jacket',
    price: '$285',
    priceValue: 285,
    description: 'Performance track jacket with moisture-wicking technology. Ideal for active lifestyles.',
    image: '/placeholder-jacket.jpg'
  },
  {
    id: 6,
    category: 'Essentials',
    name: 'Crew Neck',
    price: '$125',
    priceValue: 125,
    description: 'Classic crew neck sweater in a relaxed fit. Versatile and comfortable.',
    image: '/placeholder-crew.jpg'
  }
]

export const getProductById = (id) => {
  return products.find(product => product.id === parseInt(id))
}

