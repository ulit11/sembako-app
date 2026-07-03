import { defineStore } from 'pinia'
import { api } from '../boot/axios'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem('token') || '',
    loading: false
  }),
  getters: {
    isAuthenticated: (state) => !!state.token
  },
  actions: {
    async login(identifier, password) {
      this.loading = true
      try {
        const response = await api.post('/api/auth/login', { identifier, password })
        this.token = response.data.token
        this.user = response.data.user
        localStorage.setItem('token', this.token)
        
        // Configure Axios default header
        api.defaults.headers.common['Authorization'] = `Bearer ${this.token}`
        return response.data
      } catch (error) {
        console.error('Login action error:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async register(name, email, password) {
      this.loading = true
      try {
        const response = await api.post('/api/auth/register', { name, email, password })
        this.token = response.data.token
        this.user = response.data.user
        localStorage.setItem('token', this.token)

        // Configure Axios default header
        api.defaults.headers.common['Authorization'] = `Bearer ${this.token}`
        return response.data
      } catch (error) {
        console.error('Register action error:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem('token')
      delete api.defaults.headers.common['Authorization']
    },

    async fetchCurrentUser() {
      if (!this.token) return null
      
      // Ensure header is set (e.g. on page refresh)
      api.defaults.headers.common['Authorization'] = `Bearer ${this.token}`
      
      this.loading = true
      try {
        const response = await api.get('/api/auth/me')
        this.user = response.data
        return this.user
      } catch (error) {
        console.warn('Failed to fetch user (token might be invalid or expired):', error.message)
        this.logout()
        return null
      } finally {
        this.loading = false
      }
    }
  }
})
