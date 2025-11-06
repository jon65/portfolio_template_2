'use client'

import React, { useState, useEffect } from 'react'
import './AdminPanel.css'

export default function AdminPanel() {
  const [orders, setOrders] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all') // 'all', 'test', 'real'
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'ordered', 'couriered', 'delivered'
  const [apiKey, setApiKey] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(null)

  useEffect(() => {
    fetchOrders()
  }, [filter, statusFilter])

  const fetchOrders = async () => {
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
      
      const headers = {}
      if (apiKey) {
        headers['X-Admin-API-Key'] = apiKey
      }

      const response = await fetch(`/api/admin/orders?${params.toString()}`, {
        headers
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized. Please enter your admin API key.')
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
  }

  const updateOrderStatus = async (orderId, newStatus) => {
    setUpdatingStatus(orderId)
    try {
      const headers = {
        'Content-Type': 'application/json'
      }
      if (apiKey) {
        headers['X-Admin-API-Key'] = apiKey
      }

      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
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

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Admin Panel - Orders</h1>
        <div className="admin-controls">
          <div className="api-key-input">
            <label>Admin API Key (optional):</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter API key if required"
            />
          </div>
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
                      <span>{order.customerName}</span>
                    </div>
                    <div className="detail-item">
                      <label>Email:</label>
                      <span>{order.customerEmail}</span>
                    </div>
                    <div className="detail-item">
                      <label>Total:</label>
                      <span className="total-amount">{formatCurrency(order.total)}</span>
                    </div>
                    <div className="detail-item">
                      <label>Payment Status:</label>
                      <span className={`payment-status ${order.paymentStatus}`}>
                        {order.paymentStatus}
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

