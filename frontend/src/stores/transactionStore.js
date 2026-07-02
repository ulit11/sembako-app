import { defineStore } from 'pinia'
import { api } from '../boot/axios'
import { useProductStore } from './productStore'

export const useTransactionStore = defineStore('transaction', {
  state: () => ({
    cart: [],
    transactions: [],
    loading: false
  }),
  getters: {
    cartTotal: (state) => {
      return state.cart.reduce((total, item) => total + (item.product.sellPrice * item.quantity), 0)
    },
    cartItemCount: (state) => {
      return state.cart.reduce((count, item) => count + item.quantity, 0)
    }
  },
  actions: {
    addToCart(product) {
      const existingItem = this.cart.find(item => item.product.id === product.id)
      if (existingItem) {
        if (existingItem.quantity < product.stock) {
          existingItem.quantity++
        }
      } else {
        if (product.stock > 0) {
          this.cart.push({
            product,
            quantity: 1
          })
        }
      }
    },

    removeFromCart(productId) {
      this.cart = this.cart.filter(item => item.product.id !== productId)
    },

    updateQuantity(productId, quantity) {
      const item = this.cart.find(item => item.product.id === productId)
      if (item) {
        const qty = parseInt(quantity)
        if (qty > 0 && qty <= item.product.stock) {
          item.quantity = qty
        }
      }
    },

    clearCart() {
      this.cart = []
    },

    async checkout(paymentMethod, customerName = '') {
      this.loading = true
      try {
        const items = this.cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity
        }))

        const payload = {
          paymentMethod,
          items
        }

        if (paymentMethod === 'Bon') {
          payload.customerName = customerName
        }

        const response = await api.post('/api/transactions', payload)
        
        // Clear cart on success
        this.clearCart()
        
        // Refresh product stats and products list since stock changed
        const productStore = useProductStore()
        await productStore.fetchStats()
        
        return response.data
      } catch (error) {
        console.error('Checkout failed:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchTransactions(filters = {}) {
      this.loading = true
      try {
        const response = await api.get('/api/transactions', { params: filters })
        this.transactions = response.data
      } catch (error) {
        console.error('Failed to fetch transactions:', error)
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})
