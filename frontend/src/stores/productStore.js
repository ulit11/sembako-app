import { defineStore } from 'pinia'
import { api } from '../boot/axios'

export const useProductStore = defineStore('product', {
  state: () => ({
    products: [],
    stats: {
      totalProducts: 0,
      totalStockValue: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      categoryCounts: {
        "Beras & Sembako": 0,
        "Minyak & Mentega": 0,
        "Mi & Instan": 0,
        "Bumbu Dapur": 0,
        "Minuman": 0,
        "Sabun & Mandi": 0,
        "Lainnya": 0
      }
    },
    loading: false
  }),
  actions: {
    async fetchProducts(filters = {}) {
      this.loading = true
      try {
        const response = await api.get('/api/products', { params: filters })
        this.products = response.data
      } catch (error) {
        console.error('Failed to fetch products:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchStats() {
      try {
        const response = await api.get('/api/stats')
        this.stats = response.data
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      }
    },

    async createProduct(productData) {
      try {
        const response = await api.post('/api/products', productData)
        this.products.unshift(response.data)
        await this.fetchStats()
        return response.data
      } catch (error) {
        console.error('Failed to create product:', error)
        throw error
      }
    },

    async updateProduct(id, productData) {
      try {
        const response = await api.put(`/api/products/${id}`, productData)
        const index = this.products.findIndex(p => p.id === id)
        if (index !== -1) {
          this.products[index] = response.data
        }
        await this.fetchStats()
        return response.data
      } catch (error) {
        console.error('Failed to update product:', error)
        throw error
      }
    },

    async deleteProduct(id) {
      try {
        await api.delete(`/api/products/${id}`)
        this.products = this.products.filter(p => p.id !== id)
        await this.fetchStats()
      } catch (error) {
        console.error('Failed to delete product:', error)
        throw error
      }
    }
  }
})
