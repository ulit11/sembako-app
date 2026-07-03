<template>
  <q-page class="q-pa-md bg-page">
    <!-- Header Greeting Card -->
    <q-card class="greeting-card q-mb-md overflow-hidden text-white shadow-3">
      <q-card-section class="q-pa-lg relative-position">
        <div class="row items-center justify-between">
          <div class="col-8">
            <h2 class="text-h6 text-weight-regular q-ma-none text-grey-2">Selamat Datang,</h2>
            <h1 class="text-h5 text-weight-bold q-ma-none text-white leading-normal">
              {{ authStore.user?.name || 'Owner Toko' }}! 👋
            </h1>
            <p class="text-caption q-mt-sm q-mb-none text-grey-3">
              Kelola stok sembako Anda dengan akurat.
            </p>
          </div>
          <div class="col-4 text-right">
            <q-avatar size="64px" class="bg-white text-primary shadow-2">
              <q-icon name="storefront" size="36px" />
            </q-avatar>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Financial Metrics (Owner Only) -->
    <div v-if="authStore.user?.role === 'OWNER'" class="row q-col-gutter-sm q-mb-md">
      <!-- Saldo Toko (QRIS & Transfer) -->
      <div class="col-6">
        <q-card class="shadow-1 rounded-borders card-surface text-center q-pa-sm" style="min-height: 120px; display: flex; flex-direction: column; justify-content: center;">
          <div class="text-caption text-grey-6 text-weight-medium uppercase tracking-wider">
            Saldo Rekening Toko
          </div>
          <div class="text-h6 text-weight-bold text-green-7 q-mt-xs">
            {{ formatRupiah(authStore.user?.balance || 0) }}
          </div>
          <div class="text-caption text-grey-5 q-mt-xs leading-none">
            Dari QRIS & Transfer Bank
          </div>
        </q-card>
      </div>

      <!-- Capital Value (Total Investasi Modal) -->
      <div class="col-6">
        <q-card class="shadow-1 rounded-borders card-surface text-center q-pa-sm" style="min-height: 120px; display: flex; flex-direction: column; justify-content: center;">
          <div class="text-caption text-grey-6 text-weight-medium uppercase tracking-wider">
            Investasi Modal
          </div>
          <div class="text-h6 text-weight-bold text-primary q-mt-xs">
            {{ formatRupiah(stats.totalStockValue) }}
          </div>
          <div class="text-caption text-grey-5 q-mt-xs leading-none">
            Total HPP modal stok
          </div>
        </q-card>
      </div>
    </div>

    <!-- Stats Summary Section -->
    <div class="row q-col-gutter-sm q-mb-md">
      <!-- Total Products Card -->
      <div class="col-4">
        <q-card class="stat-card text-center q-py-sm cursor-pointer shadow-1" @click="goToProducts()">
          <q-card-section class="q-pa-xs">
            <q-avatar color="blue-1" text-color="blue-9" icon="inventory" size="36px" />
            <div class="text-weight-bold text-h6 q-mt-xs text-grey-9 dark-text">{{ stats.totalProducts || 0 }}</div>
            <div class="text-caption text-grey-6 text-weight-medium">Semua Item</div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Low Stock Card -->
      <div class="col-4">
        <q-card class="stat-card text-center q-py-sm cursor-pointer shadow-1" @click="goToProductsWithStatus('low_stock')">
          <q-card-section class="q-pa-xs">
            <q-avatar color="amber-1" text-color="amber-9" icon="warning" size="36px" />
            <div class="text-weight-bold text-h6 q-mt-xs text-grey-9 dark-text">{{ stats.lowStockCount || 0 }}</div>
            <div class="text-caption text-grey-6 text-weight-medium">Stok Menipis</div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Out of Stock Card -->
      <div class="col-4">
        <q-card class="stat-card text-center q-py-sm cursor-pointer shadow-1" @click="goToProductsWithStatus('out_of_stock')">
          <q-card-section class="q-pa-xs">
            <q-avatar color="red-1" text-color="red-9" icon="block" size="36px" />
            <div class="text-weight-bold text-h6 q-mt-xs text-grey-9 dark-text">{{ stats.outOfStockCount || 0 }}</div>
            <div class="text-caption text-grey-6 text-weight-medium">Stok Habis</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Category Progress Breakdown -->
    <q-card class="q-mb-md shadow-1 rounded-borders card-surface">
      <q-card-section class="q-pb-none">
        <div class="text-subtitle1 text-weight-bold text-grey-9 dark-text row items-center">
          <q-icon name="category" color="primary" class="q-mr-xs" size="20px" />
          Kategori Sembako
        </div>
      </q-card-section>

      <q-card-section class="q-pt-sm">
        <div v-for="cat in categories" :key="cat.name" class="q-mb-md">
          <div class="row justify-between items-center q-mb-xs">
            <div class="row items-center col-8">
              <q-avatar :color="cat.bg" :text-color="cat.color" :icon="cat.icon" size="28px" class="q-mr-sm" />
              <span class="text-subtitle2 text-weight-medium text-grey-8 dark-text">{{ cat.name }}</span>
            </div>
            <div class="col-4 text-right text-caption text-weight-bold text-grey-7 dark-text">
              {{ getCategoryCount(cat.name) }} Item
            </div>
          </div>
          <q-linear-progress
            :value="getCategoryPercent(cat.name)"
            :color="cat.color"
            class="rounded-borders"
            height="8px"
            track-color="grey-2"
          />
        </div>
      </q-card-section>
    </q-card>

    <!-- Cashier Management Section (Owner Only) -->
    <q-card v-if="authStore.user?.role === 'OWNER'" class="q-mb-md shadow-1 rounded-borders card-surface">
      <q-card-section class="q-pb-none row justify-between items-center">
        <div class="text-subtitle1 text-weight-bold text-grey-9 dark-text row items-center">
          <q-icon name="people" color="primary" class="q-mr-xs" size="20px" />
          Karyawan Kasir
        </div>
        <q-btn
          color="primary"
          flat
          dense
          icon="person_add"
          label="Tambah Kasir"
          no-caps
          @click="showCashierDialog = true"
        />
      </q-card-section>

      <q-card-section class="q-pt-sm">
        <div v-if="cashiers.length === 0" class="text-center q-py-md text-caption text-grey-5">
          Belum ada kasir terdaftar. Buatkan akun kasir untuk karyawan Anda.
        </div>
        <q-list v-else separator class="rounded-borders q-mt-xs">
          <q-item v-for="c in cashiers" :key="c.id" class="q-py-sm q-px-none">
            <q-item-section>
              <q-item-label class="text-weight-bold text-grey-9 dark-text">{{ c.name }}</q-item-label>
              <q-item-label caption>{{ c.email }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-chip dense color="blue-1" text-color="blue-9" label="Kasir" size="10px" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>

    <!-- Quick Action Banner for Kulakan -->
    <q-card
      v-if="stats.lowStockCount > 0 || stats.outOfStockCount > 0"
      class="q-mb-md text-white shadow-1 text-center border-glow cursor-pointer bg-warning"
      @click="goToProductsWithStatus('low_stock')"
    >
      <q-card-section class="q-py-md">
        <div class="row items-center justify-center text-grey-9">
          <q-icon name="shopping_cart_checkout" size="28px" class="q-mr-sm text-grey-9" />
          <div class="text-subtitle2 text-weight-bold">
            Ada {{ (stats.lowStockCount || 0) + (stats.outOfStockCount || 0) }} item harus kulakan sekarang! &rarr;
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Add Cashier Dialog -->
    <q-dialog v-model="showCashierDialog" persistent>
      <q-card style="width: 400px; max-width: 90vw;" class="card-surface rounded-borders">
        <q-card-section class="bg-primary text-white q-py-md">
          <div class="text-subtitle1 text-weight-bold">Daftarkan Kasir Baru</div>
        </q-card-section>

        <q-card-section class="q-pa-md">
          <q-form @submit="handleRegisterCashier" class="q-gutter-y-sm">
            <q-input
              v-model="cashierForm.name"
              label="Nama Lengkap Karyawan *"
              outlined
              dense
              placeholder="Contoh: Budi Prasetyo"
              :rules="[val => !!val || 'Nama wajib diisi']"
            />
            <q-input
              v-model="cashierForm.email"
              type="email"
              label="Email Kasir (Untuk Login) *"
              outlined
              dense
              placeholder="budi@example.com"
              :rules="[val => !!val || 'Email wajib diisi']"
            />
            <q-input
              v-model="cashierForm.password"
              type="password"
              label="Password Akun *"
              outlined
              dense
              placeholder="Minimal 6 karakter"
              :rules="[
                val => !!val || 'Password wajib diisi',
                val => val.length >= 6 || 'Password minimal 6 karakter'
              ]"
            />

            <!-- Actions -->
            <div class="row justify-end q-gutter-x-sm q-mt-md">
              <q-btn flat label="Batal" color="grey-7" no-caps v-close-popup />
              <q-btn type="submit" label="Daftarkan" color="primary" no-caps class="text-weight-bold" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { storeToRefs } from 'pinia'
import { useProductStore } from '../stores/productStore'
import { useAuthStore } from '../stores/authStore'
import { api } from '../boot/axios'

const $q = useQuasar()
const router = useRouter()
const productStore = useProductStore()
const authStore = useAuthStore()
const { stats } = storeToRefs(productStore)

const cashiers = ref([])
const showCashierDialog = ref(false)
const cashierForm = ref({
  name: '',
  email: '',
  password: ''
})

onMounted(async () => {
  await productStore.fetchStats()
  await authStore.fetchCurrentUser()
  if (authStore.user?.role === 'OWNER') {
    await fetchCashiers()
  }
})

async function fetchCashiers() {
  try {
    const res = await api.get('/api/auth/cashiers')
    cashiers.value = res.data
  } catch (err) {
    console.error('Failed to fetch cashiers:', err)
  }
}

async function handleRegisterCashier() {
  $q.loading.show({ message: 'Mendaftarkan kasir...' })
  try {
    await api.post('/api/auth/cashier', cashierForm.value)
    $q.notify({
      type: 'positive',
      message: `Akun kasir ${cashierForm.value.name} berhasil dibuat!`
    })
    showCashierDialog.value = false
    cashierForm.value = { name: '', email: '', password: '' }
    await fetchCashiers()
  } catch (error) {
    const errMsg = error.response?.data?.error || 'Gagal mendaftarkan kasir.'
    $q.notify({
      type: 'negative',
      message: errMsg
    })
  } finally {
    $q.loading.hide()
  }
}

const categories = [
  { name: 'Beras & Sembako', icon: 'rice_bowl', color: 'primary', bg: 'blue-1' },
  { name: 'Minyak & Mentega', icon: 'opacity', color: 'orange', bg: 'orange-1' },
  { name: 'Mi & Instan', icon: 'ramen_dining', color: 'red', bg: 'red-1' },
  { name: 'Bumbu Dapur', icon: 'soup_kitchen', color: 'teal', bg: 'teal-1' },
  { name: 'Minuman', icon: 'local_drink', color: 'indigo', bg: 'indigo-1' },
  { name: 'Sabun & Mandi', icon: 'clean_hands', color: 'pink', bg: 'pink-1' },
  { name: 'Lainnya', icon: 'more_horiz', color: 'grey-7', bg: 'grey-2' }
]

function getCategoryCount(catName) {
  return stats.value.categoryCounts ? stats.value.categoryCounts[catName] || 0 : 0
}

function getCategoryPercent(catName) {
  const total = stats.value.totalProducts || 0
  if (total === 0) return 0
  const count = getCategoryCount(catName)
  return count / total
}

function formatRupiah(val) {
  if (val === undefined || val === null || val === '') return 'Rp 0'
  const number = Math.round(Number(val))
  return 'Rp ' + number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function goToProducts() {
  router.push('/products')
}

function goToProductsWithStatus(stockStatus) {
  router.push({ path: '/products', query: { stockStatus } })
}
</script>

<style lang="scss" scoped>
.greeting-card {
  background: linear-gradient(135deg, var(--q-primary) 0%, #3a0ca3 100%);
  border-radius: 16px;
}

.stat-card {
  border-radius: 12px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  background-color: #ffffff;
  
  .body--dark & {
    background-color: #1d1d1d;
  }

  &:active {
    transform: scale(0.95);
  }
}

.card-surface {
  background-color: #ffffff;
  .body--dark & {
    background-color: #1d1d1d;
  }
}

.dark-text {
  .body--dark & {
    color: #f5f5f5 !important;
  }
}

.leading-normal {
  line-height: 1.25;
}

.rounded-borders {
  border-radius: 8px;
}

.border-glow {
  border-radius: 12px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(242, 169, 0, 0.3);
  
  &:active {
    transform: scale(0.98);
  }
}

.uppercase {
  text-transform: uppercase;
}

.tracking-wider {
  letter-spacing: 0.05em;
}
</style>
