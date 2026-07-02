import { defineStore } from 'pinia'
import { api } from '../boot/axios'

export const useReportStore = defineStore('report', {
  state: () => ({
    reports: {
      sales: {
        totalRevenue: 0,
        totalTransactions: 0,
        byPaymentMethod: { Tunai: 0, QRIS: 0, Bon: 0 },
        bonList: [],
        transactions: []
      },
      profitAndLoss: {
        revenue: 0,
        cogs: 0,
        netProfit: 0
      },
      stock: {
        totalStockValueModal: 0,
        totalStockValueJual: 0,
        potentialProfit: 0,
        outOfStockCount: 0,
        lowStockCount: 0,
        totalUniqueProducts: 0
      }
    },
    loading: false
  }),
  actions: {
    async fetchReports(filterRange = 'bulan_ini') {
      this.loading = true
      try {
        const response = await api.get('/api/reports', { params: { filterRange } })
        this.reports = response.data
      } catch (error) {
        console.error('Failed to fetch reports:', error)
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})
