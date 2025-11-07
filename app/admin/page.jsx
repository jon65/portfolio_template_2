'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import './AdminPanel.css'

export default function AdminPanel() {
  const router = useRouter()
  const [orders, setOrders] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all') // 'all', 'test', 'real'
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'ordered', 'couriered', 'delivered'
  const [updatingStatus, setUpdatingStatus] = useState(null)
  const [user, setUser] = useState(null)

  // Check authentication on mount
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (!response.ok) {
        router.push('/admin/login')
        return
      }
      const data = await response.json()
      setUser(data.user)
    } catch (error) {
      router.push('/admin/login')
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/admin/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      if (filter === 'test') {
        params.append('testMode', 'true')
      } else if (filter === 'real') {
        params.append('testMode', 'false')
      }
      params.append('includeMetrics', 'true')

      const response = await fetch(`/api/admin/orders?${params.toString()}`)

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin/login')
          return
        }
        throw new Error(`Failed to fetch orders: ${response.statusText}`)
      }

      const data = await response.json()
      setOrders(data.orders || [])
      setMetrics(data.metrics || null)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching orders:', err)
    } finally {
      setLoading(false)
    }
  }, [filter, router])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const updateOrderStatus = async (orderId, newStatus) => {
    setUpdatingStatus(orderId)
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin/login')
          return
        }
        throw new Error('Failed to update order status')
      }

      // Refresh orders after update
      await fetchOrders()
    } catch (err) {
      setError(err.message)
      console.error('Error updating order status:', err)
    } finally {
      setUpdatingStatus(null)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  // Filter orders by status
  const filteredOrders = statusFilter === 'all' 
    ? orders 
    : orders.filter(order => (order.orderStatus || 'ordered') === statusFilter)

  if (!user) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <div className="admin-header-top">
          <h1>Admin Panel - Orders</h1>
          <div className="admin-user-info">
            <span className="user-email">{user.email}</span>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
        <div className="admin-controls">
          <div className="filter-buttons">
            <button
              className={filter === 'all' ? 'active' : ''}
              onClick={() => setFilter('all')}
            >
              All Orders
            </button>
            <button
              className={filter === 'real' ? 'active' : ''}
              onClick={() => setFilter('real')}
            >
              Real Orders
            </button>
            <button
              className={filter === 'test' ? 'active' : ''}
              onClick={() => setFilter('test')}
            >
              Test Orders
            </button>
            <button onClick={fetchOrders} className="refresh-button">
              Refresh
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      {/* Metrics Dashboard */}
      {metrics && (
        <div className="metrics-dashboard">
          <div className="metric-card">
            <div className="metric-label">Total Orders</div>
            <div className="metric-value">{metrics.totalOrders}</div>
          </div>
          <div className="metric-card revenue">
            <div className="metric-label">Total Revenue</div>
            <div className="metric-value">{formatCurrency(metrics.totalRevenue)}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Average Order Value</div>
            <div className="metric-value">{formatCurrency(metrics.averageOrderValue)}</div>
          </div>
          <div className="metric-card status-breakdown">
            <div className="metric-label">Status Breakdown</div>
            <div className="status-metrics">
              <div className="status-metric">
                <span className="status-indicator ordered"></span>
                <span className="status-count">{metrics.statusCounts.ordered} Ordered</span>
              </div>
              <div className="status-metric">
                <span className="status-indicator couriered"></span>
                <span className="status-count">{metrics.statusCounts.couriered} Couriered</span>
              </div>
              <div className="status-metric">
                <span className="status-indicator delivered"></span>
                <span className="status-count">{metrics.statusCounts.delivered} Delivered</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Filter */}
      {orders.length > 0 && (
        <div className="status-filter-section">
          <label>Filter by Status:</label>
          <div className="status-filter-buttons">
            <button
              className={statusFilter === 'all' ? 'active' : ''}
              onClick={() => setStatusFilter('all')}
            >
              All ({orders.length})
            </button>
            <button
              className={statusFilter === 'ordered' ? 'active' : ''}
              onClick={() => setStatusFilter('ordered')}
            >
              Ordered ({metrics?.statusCounts?.ordered || 0})
            </button>
            <button
              className={statusFilter === 'couriered' ? 'active' : ''}
              onClick={() => setStatusFilter('couriered')}
            >
              Couriered ({metrics?.statusCounts?.couriered || 0})
            </button>
            <button
              className={statusFilter === 'delivered' ? 'active' : ''}
              onClick={() => setStatusFilter('delivered')}
            >
              Delivered ({metrics?.statusCounts?.delivered || 0})
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading orders...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="no-orders">No orders found</div>
      ) : (
        <div className="orders-container">
          <div className="orders-summary">
            <p>Showing <strong>{filteredOrders.length}</strong> of <strong>{orders.length}</strong> orders</p>
          </div>
          
          <div className="orders-list">
            {filteredOrders.map((order) => {
              const currentStatus = order.orderStatus || 'ordered'
              return (
                <div key={order.orderId} className={`order-card ${order.isTestMode ? 'test-order' : ''}`}>
                  <div className="order-header">
                    <div className="order-id-section">
                      <h3>Order #{order.orderId.slice(-8)}</h3>
                      {order.isTestMode && (
                        <span className="test-badge">TEST MODE</span>
                      )}
                    </div>
                    <div className="order-status-section">
                      <div className="order-status-controls">
                        <label>Order Status:</label>
                        <select
                          value={currentStatus}
                          onChange={(e) => updateOrderStatus(order.orderId, e.target.value)}
                          disabled={updatingStatus === order.orderId}
                          className="status-select"
                        >
                          <option value="ordered">Ordered</option>
                          <option value="couriered">Couriered</option>
                          <option value="delivered">Delivered</option>
                        </select>
                        {updatingStatus === order.orderId && (
                          <span className="updating-indicator">Updating...</span>
                        )}
                      </div>
                      <span className={`order-status-badge ${currentStatus}`}>
                        {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div className="order-details-grid">
                    <div className="detail-item">
                      <label>Order ID:</label>
                      <span>{order.orderId}</span>
                    </div>
                    <div className="detail-item">
                      <label>Date:</label>
                      <span>{formatDate(order.createdAt)}</span>
                    </div>
                    <div className="detail-item">
                      <label>Customer:</label>
                      <span>{order.customerName || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Email:</label>
                      <span>{order.customerEmail || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Total:</label>
                      <span className="total-amount">{formatCurrency(order.total || 0)}</span>
                    </div>
                    <div className="detail-item">
                      <label>Payment Status:</label>
                      <span className={`payment-status ${order.paymentStatus || 'pending'}`}>
                        {order.paymentStatus || 'pending'}
                      </span>
                    </div>
                  </div>

                  {order.shipping && (
                    <div className="shipping-section">
                      <h4>Shipping Address</h4>
                      <div className="shipping-details">
                        <p>
                          {order.shipping.firstName} {order.shipping.lastName}
                        </p>
                        <p>{order.shipping.address}</p>
                        <p>
                          {order.shipping.city}, {order.shipping.state} {order.shipping.zipCode}
                        </p>
                        <p>{order.shipping.country}</p>
                        {order.shipping.phone && <p>Phone: {order.shipping.phone}</p>}
                      </div>
                    </div>
                  )}

                  {order.items && order.items.length > 0 && (
                    <div className="items-section">
                      <h4>Order Items</h4>
                      <table className="items-table">
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Category</th>
                            <th>Quantity</th>
                            <th>Price</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map((item, index) => {
                            const itemPrice = parseFloat(item.price.replace('$', ''))
                            const itemTotal = itemPrice * item.quantity
                            return (
                              <tr key={index}>
                                <td data-label="Item">{item.name}</td>
                                <td data-label="Category">{item.category}</td>
                                <td data-label="Quantity">{item.quantity}</td>
                                <td data-label="Price">{formatCurrency(itemPrice)}</td>
                                <td data-label="Total">{formatCurrency(itemTotal)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan="4" className="text-right">Subtotal:</td>
                            <td>{formatCurrency(order.subtotal)}</td>
                          </tr>
                          <tr>
                            <td colSpan="4" className="text-right">Shipping:</td>
                            <td>{formatCurrency(order.shippingCost)}</td>
                          </tr>
                          <tr className="total-row">
                            <td colSpan="4" className="text-right"><strong>Total:</strong></td>
                            <td><strong>{formatCurrency(order.total)}</strong></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

