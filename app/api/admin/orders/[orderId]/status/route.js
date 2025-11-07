import { NextResponse } from 'next/server'
import { updateOrderStatus } from '../../../lib/order-storage'

/**
 * PATCH /api/admin/orders/[orderId]/status
 * Update order status
 */
export async function PATCH(
  request,
  { params }
) {
  try {
    // Verify authentication
    const { requireAuth } = await import('../../lib/auth')
    try {
      await requireAuth()
    } catch (error) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { orderId } = await params
    const body = await request.json()
    const { status } = body

    // Validate status
    const validStatuses = ['ordered', 'couriered', 'delivered']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Update order status
    const result = await updateOrderStatus(orderId, status)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update order status' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      orderId,
      orderStatus: status,
      message: `Order status updated to ${status}`
    })
  } catch (error) {
    console.error('Error updating order status:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

