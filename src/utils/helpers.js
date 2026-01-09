/**
 * Utilidades para formatos y cálculos
 */

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    minimumFractionDigits: 2
  }).format(amount)
}

export const formatDate = (date) => {
  return new Intl.DateTimeFormat('es-CR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date instanceof Date ? date : date.toDate())
}

export const calculateProfit = (salePrice, costPrice) => {
  if (costPrice === 0) return 0
  return ((salePrice - costPrice) / costPrice) * 100
}

export const calculateTotalRevenue = (sales) => {
  return sales.reduce((sum, sale) => sum + (sale.total || 0), 0)
}

export const calculateTotalCost = (items, products) => {
  return items.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId)
    return sum + ((product?.costPrice || 0) * item.quantity)
  }, 0)
}

export const getPendingBalance = (total, paid) => {
  return Math.max(0, total - paid)
}

export const isPaymentComplete = (total, paid) => {
  return paid >= total
}

/**
 * Función para aplicar la regla crítica de abonos
 * Ordena items por precio ascendente y liquida secuencialmente
 */
export const applyPaymentRule = (items, paymentAmount) => {
  const sortedItems = [...items].sort((a, b) => a.unitPrice - b.unitPrice)
  const result = []
  let remaining = paymentAmount

  for (const item of sortedItems) {
    if (remaining <= 0) {
      result.push({ ...item, amountApplied: 0 })
      continue
    }

    const itemPending = item.pending || (item.subtotal - (item.paid || 0))
    const amountApplied = Math.min(remaining, itemPending)

    result.push({
      ...item,
      amountApplied,
      newPaid: (item.paid || 0) + amountApplied,
      newPending: itemPending - amountApplied
    })

    remaining -= amountApplied
  }

  return { appliedItems: result, remainingPayment: remaining }
}
