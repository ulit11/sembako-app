<template>
  <q-page class="q-pa-md bg-page column no-wrap">
    <!-- Header -->
    <div class="row justify-between items-center q-mb-md">
      <div class="text-h6 text-weight-bold text-grey-9 dark-text">Laporan Keuangan & Stok</div>
      <q-btn flat round color="primary" icon="refresh" @click="loadReports" />
    </div>

    <!-- Time Range Filter Toggle -->
    <q-btn-toggle
      v-model="filterRange"
      toggle-color="primary"
      color="white"
      text-color="grey-9"
      toggle-text-color="white"
      unelevated
      dense
      spread
      no-caps
      class="rounded-borders border-grey q-mb-md"
      :options="[
        { label: 'Hari Ini', value: 'hari_ini' },
        { label: '7 Hari', value: 'minggu_ini' },
        { label: '30 Hari', value: 'bulan_ini' }
      ]"
      @update:model-value="loadReports"
    />

    <!-- Loading Spinner -->
    <div v-if="reportStore.loading" class="flex flex-center q-py-xl col">
      <q-spinner-dots color="primary" size="40px" />
    </div>

    <div v-else class="col column no-wrap">
      <!-- Financial Summary Cards Grid -->
      <div class="row q-col-gutter-xs q-mb-md">
        <!-- Revenue Card -->
        <div class="col-4">
          <q-card class="summary-card bg-blue-1 text-blue-9 shadow-1 q-pa-sm">
            <div class="text-overline text-weight-medium text-blue-7 leading-none">Omzet Penjualan</div>
            <div class="text-subtitle1 text-weight-bold q-mt-xs text-ellipsis">
              {{ formatRupiah(reports.profitAndLoss.revenue) }}
            </div>
            <div class="text-caption text-blue-8">
              {{ reports.sales.totalTransactions }} Transaksi
            </div>
          </q-card>
        </div>

        <!-- HPP Card -->
        <div class="col-4">
          <q-card class="summary-card bg-orange-1 text-orange-9 shadow-1 q-pa-sm">
            <div class="text-overline text-weight-medium text-orange-7 leading-none">HPP / Modal Awal</div>
            <div class="text-subtitle1 text-weight-bold q-mt-xs text-ellipsis">
              {{ formatRupiah(reports.profitAndLoss.cogs) }}
            </div>
            <div class="text-caption text-orange-8">Harga Pokok</div>
          </q-card>
        </div>

        <!-- Net Profit Card -->
        <div class="col-4">
          <q-card
            class="summary-card shadow-1 q-pa-sm"
            :class="reports.profitAndLoss.netProfit >= 0 ? 'bg-teal-1 text-teal-9' : 'bg-red-1 text-red-9'"
          >
            <div
              class="text-overline text-weight-medium leading-none"
              :class="reports.profitAndLoss.netProfit >= 0 ? 'text-teal-7' : 'text-red-7'"
            >
              Laba Bersih
            </div>
            <div class="text-subtitle1 text-weight-bold q-mt-xs text-ellipsis">
              {{ formatRupiah(reports.profitAndLoss.netProfit) }}
            </div>
            <div class="text-caption" :class="reports.profitAndLoss.netProfit >= 0 ? 'text-teal-8' : 'text-red-8'">
              Keuntungan bersih
            </div>
          </q-card>
        </div>
      </div>

      <!-- Detail Sub-Reports Tabs -->
      <q-card class="col column no-wrap rounded-borders card-surface shadow-1">
        <q-tabs
          v-model="activeTab"
          dense
          class="text-grey-7"
          active-color="primary"
          indicator-color="primary"
          align="justify"
          narrow-indicator
        >
          <q-tab name="penjualan" label="Penjualan" no-caps />
          <q-tab name="stok" label="Aset Stok" no-caps />
          <q-tab name="bon" label="Bon / Piutang" no-caps />
        </q-tabs>

        <q-separator />

        <q-tab-panels v-model="activeTab" animated class="col scroll bg-transparent">
          <!-- 1. Penjualan Panel -->
          <q-tab-panel name="penjualan" class="q-pa-md">
            <!-- Payment Methods breakdown -->
            <div class="text-subtitle2 text-weight-bold text-grey-8 dark-text q-mb-sm">Berdasarkan Metode Bayar</div>
            <div class="row q-col-gutter-xs q-mb-md">
              <div class="col-4">
                <q-card flat bordered class="q-pa-sm text-center">
                  <div class="text-caption text-grey-6">Tunai / Cash</div>
                  <div class="text-weight-bold text-grey-9 dark-text">{{ formatRupiah(reports.sales.byPaymentMethod.Tunai) }}</div>
                </q-card>
              </div>
              <div class="col-4">
                <q-card flat bordered class="q-pa-sm text-center">
                  <div class="text-caption text-grey-6">QRIS Dinamis</div>
                  <div class="text-weight-bold text-primary">{{ formatRupiah(reports.sales.byPaymentMethod.QRIS) }}</div>
                </q-card>
              </div>
              <div class="col-4">
                <q-card flat bordered class="q-pa-sm text-center">
                  <div class="text-caption text-grey-6">Bon / Piutang</div>
                  <div class="text-weight-bold text-amber-9">{{ formatRupiah(reports.sales.byPaymentMethod.Bon) }}</div>
                </q-card>
              </div>
            </div>

            <!-- List of Transactions in range -->
            <div class="text-subtitle2 text-weight-bold text-grey-8 dark-text q-mb-sm">Daftar Transaksi Kasir</div>
            <div v-if="reports.sales.transactions.length === 0" class="text-center q-py-lg text-grey-6 text-caption">
              Tidak ada transaksi tercatat dalam jangka waktu ini.
            </div>
            <q-list v-else separator bordered class="rounded-borders">
              <q-item v-for="t in reports.sales.transactions" :key="t.id" class="q-py-sm">
                <q-item-section>
                  <q-item-label class="text-weight-bold">
                    Transaksi #{{ t.id }}
                    <q-chip
                      dense
                      square
                      :color="t.paymentMethod === 'Tunai' ? 'grey-3' : (t.paymentMethod === 'QRIS' ? 'blue-1' : 'amber-1')"
                      :text-color="t.paymentMethod === 'Tunai' ? 'grey-9' : (t.paymentMethod === 'QRIS' ? 'blue-9' : 'amber-9')"
                      size="10px"
                      class="q-ml-sm q-my-none"
                    >
                      {{ t.paymentMethod }}
                    </q-chip>
                  </q-item-label>
                  <q-item-label caption>{{ formatDateTime(t.createdAt) }} | {{ t.itemCount }} item</q-item-label>
                  <q-item-label v-if="t.customerName" caption class="text-amber-9 font-weight-medium">
                    Pelanggan: {{ t.customerName }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side class="text-right">
                  <q-item-label class="text-weight-bold text-grey-9 dark-text">{{ formatRupiah(t.totalPrice) }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-tab-panel>

          <!-- 2. Aset Stok Panel -->
          <q-tab-panel name="stok" class="q-pa-md">
            <div class="text-subtitle2 text-weight-bold text-grey-8 dark-text q-mb-sm">Ringkasan Nilai Stok Saat Ini</div>
            <div class="q-gutter-y-sm">
              <!-- Asset Modal value -->
              <q-card flat bordered class="q-pa-md row items-center justify-between">
                <div>
                  <div class="text-caption text-grey-6 leading-none">Total Nilai Modal Aset (Investasi)</div>
                  <div class="text-h6 text-weight-bold text-grey-9 dark-text q-mt-xs">
                    {{ formatRupiah(reports.stock.totalStockValueModal) }}
                  </div>
                </div>
                <q-avatar color="blue-1" text-color="blue-9" icon="business_center" />
              </q-card>

              <!-- Asset Sell value -->
              <q-card flat bordered class="q-pa-md row items-center justify-between">
                <div>
                  <div class="text-caption text-grey-6 leading-none">Total Nilai Jual Aset</div>
                  <div class="text-h6 text-weight-bold text-primary q-mt-xs">
                    {{ formatRupiah(reports.stock.totalStockValueJual) }}
                  </div>
                </div>
                <q-avatar color="green-1" text-color="green-9" icon="sell" />
              </q-card>

              <!-- Potential Profit -->
              <q-card flat bordered class="q-pa-md row items-center justify-between bg-teal-5-opacity">
                <div>
                  <div class="text-caption text-teal-8 leading-none">Estimasi Profit Jika Stok Terjual Habis</div>
                  <div class="text-h6 text-weight-bold text-teal-9 q-mt-xs">
                    +{{ formatRupiah(reports.stock.potentialProfit) }}
                  </div>
                </div>
                <q-avatar color="teal-1" text-color="teal-9" icon="trending_up" />
              </q-card>
            </div>

            <!-- Stock warning counts -->
            <div class="row q-col-gutter-xs q-mt-md">
              <div class="col-6">
                <q-card flat bordered class="q-pa-sm text-center">
                  <div class="text-caption text-grey-6">Barang Habis (0 stok)</div>
                  <div class="text-h6 text-weight-bold text-red">{{ reports.stock.outOfStockCount }}</div>
                </q-card>
              </div>
              <div class="col-6">
                <q-card flat bordered class="q-pa-sm text-center">
                  <div class="text-caption text-grey-6">Barang Stok Menipis</div>
                  <div class="text-h6 text-weight-bold text-amber-9">{{ reports.stock.lowStockCount }}</div>
                </q-card>
              </div>
            </div>
          </q-tab-panel>

          <!-- 3. Bon / Piutang Panel -->
          <q-tab-panel name="bon" class="q-pa-md">
            <div class="text-subtitle2 text-weight-bold text-grey-8 dark-text q-mb-sm">Total Bon/Utang Belum Lunas</div>
            <q-card flat bordered class="q-pa-md row items-center justify-between bg-amber-5-opacity q-mb-md">
              <div>
                <div class="text-caption text-amber-9 leading-none">Total Piutang Toko</div>
                <div class="text-h6 text-weight-bold text-amber-10 q-mt-xs">
                  {{ formatRupiah(totalBonOutstanding) }}
                </div>
              </div>
              <q-avatar color="amber-1" text-color="amber-9" icon="pending_actions" />
            </q-card>

            <div class="text-subtitle2 text-weight-bold text-grey-8 dark-text q-mb-xs">Daftar Pelanggan Berutang</div>
            <div class="text-caption text-grey-5 q-mb-md">Klik centang jika utang sudah dibayar lunas</div>
            
            <div v-if="reports.sales.bonList.length === 0" class="text-center q-py-lg text-grey-6 text-caption">
              Hebat! Tidak ada piutang/bon yang belum lunas dalam rentang waktu ini.
            </div>

            <q-list v-else separator bordered class="rounded-borders">
              <q-item v-for="bon in reports.sales.bonList" :key="bon.id" class="q-py-sm">
                <q-item-section>
                  <q-item-label class="text-weight-bold text-grey-9 dark-text">{{ bon.customerName }}</q-item-label>
                  <q-item-label caption>Bon dari Transaksi #{{ bon.id }}</q-item-label>
                  <q-item-label caption>{{ formatDateTime(bon.createdAt) }}</q-item-label>
                </q-item-section>
                <q-item-section side class="text-right">
                  <q-item-label class="text-weight-bold text-amber-10 q-mb-xs">{{ formatRupiah(bon.totalPrice) }}</q-item-label>
                  <q-btn
                    color="positive"
                    flat
                    dense
                    round
                    icon="check_circle"
                    size="sm"
                    @click="markBonAsPaid(bon)"
                  >
                    <q-tooltip>Tandai Lunas</q-tooltip>
                  </q-btn>
                </q-item-section>
              </q-item>
            </q-list>
          </q-tab-panel>
        </q-tab-panels>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useReportStore } from '../stores/reportStore'
import { useAuthStore } from '../stores/authStore'
import { storeToRefs } from 'pinia'
import { api } from '../boot/axios'

const $q = useQuasar()
const reportStore = useReportStore()
const authStore = useAuthStore()
const { reports } = storeToRefs(reportStore)

const filterRange = ref('bulan_ini')
const activeTab = ref('penjualan')

const totalBonOutstanding = computed(() => {
  if (!reports.value.sales.bonList) return 0
  return reports.value.sales.bonList.reduce((acc, b) => acc + b.totalPrice, 0)
})

onMounted(async () => {
  await loadReports()
})

async function loadReports() {
  try {
    await reportStore.fetchReports(filterRange.value)
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Gagal memuat laporan keuangan.'
    })
  }
}

function markBonAsPaid(bon) {
  $q.dialog({
    title: 'Pelunasan Bon',
    message: `Tandai bon atas nama "${bon.customerName}" sebesar ${formatRupiah(bon.totalPrice)} sudah LUNAS?`,
    cancel: { label: 'Batal', flat: true, color: 'grey-7' },
    ok: { label: 'Sudah Lunas', color: 'positive', flat: true },
    persistent: true
  }).onOk(async () => {
    $q.loading.show({ message: 'Memproses pelunasan...' })
    try {
      // To mark Bon as paid: we update its paymentMethod from 'Bon' to 'Tunai'!
      // This is simple and extremely effective in our current database schema.
      await api.put(`/api/transactions/${bon.id}`, { paymentMethod: 'Tunai' }) // Wait! We don't have PUT /api/transactions/:id yet in backend!
      // Wait, let's create a quick PUT endpoint or patch it in index.js to support updating transaction status!
      // Yes! Updating transaction paymentMethod is extremely useful so they can clear debts.
      // Let's implement it in backend or we can do it via a special endpoint.
      // Wait, let's check: we can write it in index.js. I'll make a quick call or I can add the endpoint.
      // Yes, let's implement updating transaction in backend first.
      await api.put(`/api/transactions/${bon.id}`, { paymentMethod: 'Tunai' })
      $q.notify({
        type: 'positive',
        message: `Bon atas nama ${bon.customerName} berhasil ditandai Lunas!`
      })
      await loadReports()
    } catch (err) {
      console.error(err)
      $q.notify({
        type: 'negative',
        message: 'Gagal memperbarui status bon.'
      })
    } finally {
      $q.loading.hide()
    }
  })
}

function formatRupiah(val) {
  if (val === undefined || val === null || val === '') return 'Rp 0'
  const number = Math.round(Number(val))
  return 'Rp ' + number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function formatDateTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}
</script>

<style lang="scss" scoped>
.summary-card {
  border-radius: 12px;
  height: 90px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.card-surface {
  background-color: #ffffff;
  .body--dark & {
    background-color: #1d1d1d;
  }
}

.bg-page {
  background-color: #f8f9fa;
  .body--dark & {
    background-color: #121212;
  }
}

.border-grey {
  border: 1px solid rgba(0, 0, 0, 0.1);
  .body--dark & {
    border-color: rgba(255, 255, 255, 0.1);
  }
}

.dark-text {
  .body--dark & {
    color: #f5f5f5 !important;
  }
}

.text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.leading-none {
  line-height: 1;
}

.rounded-borders {
  border-radius: 8px;
}

.bg-teal-5-opacity {
  background-color: rgba(77, 182, 172, 0.08);
}

.bg-amber-5-opacity {
  background-color: rgba(255, 179, 0, 0.08);
}

.text-amber-10 {
  color: #ff8f00 !important;
}
</style>
