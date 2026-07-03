<template>
  <q-page class="q-pa-md bg-page">
    <!-- Header with Action -->
    <div class="row justify-between items-center q-mb-md">
      <div class="text-h6 text-weight-bold text-grey-9 dark-text">Stok Sembako</div>
      <div class="row q-gutter-x-sm items-center">
        <!-- Opsi A & B (Restricted to Test Users) -->
        <template v-if="isAllowedTestUser">
          <q-btn-dropdown
            color="secondary"
            icon="auto_awesome"
            label="Pilihan Uji Coba"
            no-caps
            class="rounded-borders text-weight-bold"
          >
            <q-list style="min-width: 250px;">
              <q-item clickable v-close-popup @click="loadSembakoTemplate">
                <q-item-section avatar>
                  <q-icon name="download" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-bold">Opsi A: Muat Template</q-item-label>
                  <q-item-label caption>Muat ~20 produk sembako terpopuler</q-item-label>
                </q-item-section>
              </q-item>

              <q-item clickable v-close-popup @click="triggerCSVImport">
                <q-item-section avatar>
                  <q-icon name="upload_file" color="secondary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-bold">Opsi B: Import CSV</q-item-label>
                  <q-item-label caption>Upload massal lewat file CSV</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
        </template>

        <q-btn
          v-if="authStore.user?.role === 'OWNER'"
          color="primary"
          icon="add"
          label="Tambah Barang"
          no-caps
          class="rounded-borders text-weight-bold"
          @click="openAddDialog"
        />
      </div>
    </div>

    <!-- Hidden File Input for CSV Import -->
    <input
      type="file"
      ref="csvFileInput"
      style="display: none"
      accept=".csv"
      @change="handleCSVFileChange"
    />

    <!-- Search & Filters -->
    <q-card class="q-mb-md shadow-1 rounded-borders card-surface">
      <q-card-section class="q-pa-sm q-gutter-y-xs">
        <q-input
          v-model="searchQuery"
          dense
          outlined
          placeholder="Cari nama barang atau barcode..."
          clearable
          @update:model-value="loadProducts"
        >
          <template v-slot:prepend>
            <q-icon name="search" />
          </template>
          <template v-slot:append>
            <q-btn
              flat
              round
              dense
              icon="photo_camera"
              color="primary"
              @click="startScanning('search')"
            >
              <q-tooltip>Scan Barcode dengan Kamera</q-tooltip>
            </q-btn>
          </template>
        </q-input>

        <div class="row q-col-gutter-xs q-mt-xs">
          <div class="col-6">
            <q-select
              v-model="selectedCategory"
              dense
              outlined
              :options="categoryOptions"
              label="Kategori"
              emit-value
              map-options
              @update:model-value="loadProducts"
            />
          </div>
          <div class="col-6">
            <q-select
              v-model="selectedStockStatus"
              dense
              outlined
              :options="stockStatusOptions"
              label="Status Stok"
              emit-value
              map-options
              @update:model-value="loadProducts"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Product list -->
    <div v-if="productStore.loading" class="flex flex-center q-py-xl">
      <q-spinner-dots color="primary" size="40px" />
    </div>

    <div v-else-if="products.length === 0" class="text-center q-py-xl text-grey-6">
      <q-icon name="inventory" size="64px" class="q-mb-md" />
      <div class="text-subtitle1">Tidak ada produk ditemukan</div>
      <div class="text-caption">Coba ganti filter pencarian atau tambahkan produk baru.</div>
    </div>

    <div v-else class="q-gutter-y-sm">
      <q-card
        v-for="product in products"
        :key="product.id"
        class="product-card shadow-1 rounded-borders card-surface"
      >
        <q-card-section class="q-pa-md">
          <div class="row justify-between items-start">
            <!-- Product Information -->
            <div class="col-9">
              <div class="row items-center q-gutter-x-xs q-mb-xs">
                <q-chip
                  dense
                  square
                  :color="getCategoryColor(product.category)"
                  text-color="white"
                  class="text-caption text-weight-medium q-ma-none"
                  size="11px"
                >
                  {{ product.category }}
                </q-chip>
                <q-chip
                  v-if="product.barcode"
                  dense
                  square
                  outline
                  color="grey-6"
                  class="text-caption q-ma-none"
                  size="11px"
                  icon="qr_code"
                >
                  {{ product.barcode }}
                </q-chip>
              </div>

              <div class="text-subtitle1 text-weight-bold text-grey-9 dark-text leading-tight q-mb-xs">
                {{ product.name }}
              </div>
              <div v-if="product.description" class="text-caption text-grey-6 q-mb-sm">
                {{ product.description }}
              </div>
            </div>

            <!-- Action buttons -->
            <div v-if="authStore.user?.role === 'OWNER'" class="col-3 text-right">
              <q-btn flat round dense color="primary" icon="edit" size="sm" @click="openEditDialog(product)" />
              <q-btn flat round dense color="negative" icon="delete" size="sm" @click="confirmDelete(product)" />
            </div>
          </div>

          <q-separator class="q-my-sm opacity-50" />

          <!-- Financial and Stock Details -->
          <div class="row items-center justify-between text-caption">
            <div class="row items-center q-gutter-x-md col-8">
              <div v-if="authStore.user?.role === 'OWNER'">
                <span class="text-grey-6 block">Harga Modal:</span>
                <span class="text-weight-bold text-grey-8 dark-text">{{ formatRupiah(product.costPrice) }}</span>
              </div>
              <div>
                <span class="text-grey-6 block">Harga Jual:</span>
                <span class="text-weight-bold text-primary">{{ formatRupiah(product.sellPrice) }}</span>
              </div>
              <div v-if="authStore.user?.role === 'OWNER'">
                <span class="text-grey-6 block">Margin Untung:</span>
                <span class="text-weight-bold text-green-7">+{{ formatRupiah(product.sellPrice - product.costPrice) }}</span>
              </div>
            </div>

            <!-- Stock Indicator -->
            <div class="text-right col-4">
              <span class="text-grey-6 block">Stok Tersedia:</span>
              <div class="row items-center justify-end q-gutter-x-xs">
                <span class="text-subtitle2 text-weight-bold text-grey-9 dark-text">
                  {{ product.stock }} {{ product.unit }}
                </span>
                <q-icon
                  :name="product.stock === 0 ? 'block' : (product.stock <= product.minStock ? 'warning' : 'check_circle')"
                  :color="product.stock === 0 ? 'red' : (product.stock <= product.minStock ? 'amber' : 'green')"
                  size="16px"
                />
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Add/Edit Dialog -->
    <q-dialog v-model="showDialog" persistent>
      <q-card style="width: 450px; max-width: 90vw;" class="card-surface rounded-borders">
        <q-card-section class="bg-primary text-white q-py-md">
          <div class="text-subtitle1 text-weight-bold">
            {{ isEditMode ? 'Edit Barang Sembako' : 'Tambah Barang Baru' }}
          </div>
        </q-card-section>

        <q-card-section class="q-pa-md scroll" style="max-height: 70vh;">
          <q-form @submit="handleSubmit" class="q-gutter-y-xs">
            <!-- Barcode -->
            <q-input
              v-model="form.barcode"
              label="Barcode / Kode Barang (Opsional)"
              outlined
              dense
              placeholder="Scan atau ketik kode barcode"
            >
              <template v-slot:prepend>
                <q-icon name="qr_code" />
              </template>
              <template v-slot:append>
                <q-btn
                  flat
                  round
                  dense
                  icon="photo_camera"
                  color="primary"
                  @click="startScanning('form')"
                >
                  <q-tooltip>Scan dengan Kamera</q-tooltip>
                </q-btn>
              </template>
            </q-input>

            <!-- Name -->
            <q-input
              v-model="form.name"
              label="Nama Produk *"
              outlined
              dense
              placeholder="Contoh: Minyak Bimoli 2L"
              :rules="[val => !!val || 'Nama produk wajib diisi']"
            >
              <template v-slot:prepend>
                <q-icon name="shopping_bag" />
              </template>
            </q-input>

            <!-- Category -->
            <q-select
              v-model="form.category"
              label="Kategori *"
              outlined
              dense
              :options="categoryOptions.filter(o => o.value)"
              emit-value
              map-options
              :rules="[val => !!val || 'Kategori wajib dipilih']"
            >
              <template v-slot:prepend>
                <q-icon name="category" />
              </template>
            </q-select>

            <!-- Unit -->
            <q-input
              v-model="form.unit"
              label="Satuan Unit * (e.g. pcs, kg, pouch, bungkus)"
              outlined
              dense
              placeholder="pcs"
              :rules="[val => !!val || 'Satuan unit wajib diisi']"
            >
              <template v-slot:prepend>
                <q-icon name="square_foot" />
              </template>
            </q-input>

            <div class="row q-col-gutter-sm">
              <!-- Stock -->
              <div class="col-6">
                <q-input
                  v-model.number="form.stock"
                  type="number"
                  label="Stok Awal *"
                  outlined
                  dense
                  min="0"
                  :rules="[val => val !== null && val >= 0 || 'Stok tidak boleh minus']"
                />
              </div>
              <!-- Min Stock -->
              <div class="col-6">
                <q-input
                  v-model.number="form.minStock"
                  type="number"
                  label="Batas Minimum *"
                  outlined
                  dense
                  min="1"
                  placeholder="5"
                  :rules="[val => !!val && val > 0 || 'Minimal batas adalah 1']"
                />
              </div>
            </div>

            <div class="row q-col-gutter-sm">
              <!-- Cost Price -->
              <div class="col-6">
                <q-input
                  v-model.number="form.costPrice"
                  type="number"
                  label="Harga Modal (HPP) *"
                  outlined
                  dense
                  prefix="Rp"
                  min="0"
                  :rules="[val => val !== null && val >= 0 || 'Harga modal wajib diisi']"
                />
              </div>
              <!-- Sell Price -->
              <div class="col-6">
                <q-input
                  v-model.number="form.sellPrice"
                  type="number"
                  label="Harga Jual *"
                  outlined
                  dense
                  prefix="Rp"
                  min="0"
                  :rules="[
                    val => val !== null && val >= 0 || 'Harga jual wajib diisi',
                    val => val >= form.costPrice || 'Harga jual tidak boleh kurang dari harga modal'
                  ]"
                />
              </div>
            </div>

            <!-- Description -->
            <q-input
              v-model="form.description"
              label="Deskripsi / Catatan (Opsional)"
              outlined
              dense
              type="textarea"
              rows="2"
              placeholder="Catatan tambahan..."
            />

            <!-- Form Actions -->
            <div class="row justify-end q-gutter-x-sm q-mt-lg q-pb-md">
              <q-btn flat label="Batal" color="grey-7" no-caps v-close-popup />
              <q-btn type="submit" :label="isEditMode ? 'Simpan' : 'Tambah'" color="primary" no-caps class="text-weight-bold" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Camera Scanner Dialog -->
    <q-dialog v-model="showScannerDialog" persistent @hide="handleScannerDialogHide">
      <q-card style="width: 350px; max-width: 90vw;" class="card-surface rounded-borders">
        <q-card-section class="bg-primary text-white q-py-md row items-center justify-between">
          <div class="text-subtitle1 text-weight-bold row items-center">
            <q-icon name="photo_camera" class="q-mr-xs" size="20px" />
            Scan Barcode Barang
          </div>
          <q-btn flat round dense icon="close" color="white" v-close-popup />
        </q-card-section>

        <q-card-section class="q-pa-md flex flex-center">
          <div id="qr-reader" style="width: 100%; border-radius: 8px; overflow: hidden; border: 1px solid #ccc;"></div>
        </q-card-section>

        <q-card-section class="q-pa-md text-center text-caption text-grey-6 q-pt-none">
          Posisikan barcode di dalam kotak scanner kamera. Pastikan pencahayaan cukup terang.
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { useProductStore } from '../stores/productStore'
import { useAuthStore } from '../stores/authStore'
import { storeToRefs } from 'pinia'
import { Html5Qrcode } from 'html5-qrcode'
import { api } from '../boot/axios'

const $q = useQuasar()
const route = useRoute()
const productStore = useProductStore()
const authStore = useAuthStore()
const { products } = storeToRefs(productStore)

const isAllowedTestUser = computed(() => {
  const allowed = ['watisulistiyo69@gmail.com', 'agung.ulit@gmail.com']
  return allowed.includes(authStore.user?.email)
})

const csvFileInput = ref(null)

const searchQuery = ref('')
const selectedCategory = ref('')
const selectedStockStatus = ref(route.query.stockStatus || '')

const showDialog = ref(false)
const isEditMode = ref(false)
const editingId = ref(null)

const showScannerDialog = ref(false)
let html5QrCode = null
let scanTarget = 'form' // 'form' or 'search'

const form = ref({
  barcode: '',
  name: '',
  description: '',
  category: 'Beras & Sembako',
  unit: 'pcs',
  stock: 0,
  minStock: 1,
  costPrice: 0,
  sellPrice: 0
})

const categoryOptions = [
  { label: 'Semua Kategori', value: '' },
  { label: 'Beras & Sembako', value: 'Beras & Sembako' },
  { label: 'Minyak & Mentega', value: 'Minyak & Mentega' },
  { label: 'Mi & Instan', value: 'Mi & Instan' },
  { label: 'Bumbu Dapur', value: 'Bumbu Dapur' },
  { label: 'Minuman', value: 'Minuman' },
  { label: 'Sabun & Mandi', value: 'Sabun & Mandi' },
  { label: 'Lainnya', value: 'Lainnya' }
]

const stockStatusOptions = [
  { label: 'Semua Status', value: '' },
  { label: 'Perlu Kulakan', value: 'restock' },
  { label: 'Stok Menipis', value: 'low_stock' },
  { label: 'Stok Habis', value: 'out_of_stock' }
]

onMounted(async () => {
  await loadProducts()
})

async function loadProducts() {
  const filters = {}
  if (searchQuery.value) filters.search = searchQuery.value
  if (selectedCategory.value) filters.category = selectedCategory.value
  if (selectedStockStatus.value) filters.stockStatus = selectedStockStatus.value

  try {
    await productStore.fetchProducts(filters)
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Gagal mengambil data produk sembako.'
    })
  }
}

function getCategoryColor(cat) {
  switch (cat) {
    case 'Beras & Sembako': return 'blue'
    case 'Minyak & Mentega': return 'orange'
    case 'Mi & Instan': return 'red'
    case 'Bumbu Dapur': return 'teal'
    case 'Minuman': return 'indigo'
    case 'Sabun & Mandi': return 'pink'
    default: return 'grey-7'
  }
}

function formatRupiah(val) {
  if (val === undefined || val === null || val === '') return 'Rp 0'
  const number = Math.round(Number(val))
  return 'Rp ' + number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function openAddDialog() {
  isEditMode.value = false
  editingId.value = null
  form.value = {
    barcode: '',
    name: '',
    description: '',
    category: 'Beras & Sembako',
    unit: 'pcs',
    stock: 0,
    minStock: 1,
    costPrice: 0,
    sellPrice: 0
  }
  showDialog.value = true
}

function openEditDialog(product) {
  isEditMode.value = true
  editingId.value = product.id
  form.value = {
    barcode: product.barcode,
    name: product.name,
    description: product.description,
    category: product.category,
    unit: product.unit,
    stock: product.stock,
    minStock: product.minStock,
    costPrice: product.costPrice,
    sellPrice: product.sellPrice
  }
  showDialog.value = true
}

async function handleSubmit() {
  $q.loading.show()
  try {
    if (isEditMode.value) {
      await productStore.updateProduct(editingId.value, form.value)
      $q.notify({
        type: 'positive',
        message: 'Barang sembako berhasil diperbarui!'
      })
    } else {
      await productStore.createProduct(form.value)
      $q.notify({
        type: 'positive',
        message: 'Barang sembako baru berhasil ditambahkan!'
      })
    }
    showDialog.value = false
    await loadProducts()
  } catch (error) {
    const errorMsg = error.response?.data?.error || 'Gagal menyimpan barang. Silakan coba lagi.'
    $q.notify({
      type: 'negative',
      message: errorMsg
    })
  } finally {
    $q.loading.hide()
  }
}

function confirmDelete(product) {
  $q.dialog({
    title: 'Hapus Barang',
    message: `Apakah Anda yakin ingin menghapus produk "${product.name}" dari stok?`,
    cancel: { label: 'Batal', flat: true, color: 'grey-7' },
    ok: { label: 'Hapus', color: 'negative', flat: true },
    persistent: true
  }).onOk(async () => {
    $q.loading.show()
    try {
      await productStore.deleteProduct(product.id)
      $q.notify({
        type: 'positive',
        message: 'Barang berhasil dihapus dari sistem.'
      })
      await loadProducts()
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: 'Gagal menghapus produk.'
      })
    } finally {
      $q.loading.hide()
    }
  })
}

// ================= TEST ACTIONS: TEMPLATE & CSV IMPORT =================

async function loadSembakoTemplate() {
  $q.dialog({
    title: 'Muat Template Sembako',
    message: 'Apakah Anda ingin memuat ~20 produk sembako populer (Minyak, Beras, Indomie, dll.) ke toko Anda secara otomatis?',
    cancel: { label: 'Batal', flat: true, color: 'grey-7' },
    ok: { label: 'Muat Produk', color: 'primary', flat: true },
    persistent: true
  }).onOk(async () => {
    $q.loading.show({ message: 'Memuat template sembako...' })
    try {
      const response = await api.post('/api/products/load-template')
      $q.notify({
        type: 'positive',
        message: response.data.message || 'Template sembako berhasil dimuat!'
      })
      await loadProducts()
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Gagal memuat template sembako.'
      $q.notify({
        type: 'negative',
        message: errorMsg
      })
    } finally {
      $q.loading.hide()
    }
  })
}

function triggerCSVImport() {
  csvFileInput.value.click()
}

function handleCSVFileChange(event) {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (e) => {
    const text = e.target.result
    try {
      const parsedProducts = parseCSV(text)
      if (parsedProducts.length === 0) {
        $q.notify({
          type: 'negative',
          message: 'File CSV kosong atau tidak memiliki header yang sesuai.'
        })
        return
      }

      $q.dialog({
        title: 'Konfirmasi Impor Massal',
        message: `Ditemukan ${parsedProducts.length} produk di dalam file CSV. Lanjutkan impor massal ke sistem?`,
        cancel: { label: 'Batal', flat: true, color: 'grey-7' },
        ok: { label: 'Impor Sekarang', color: 'primary', flat: true },
        persistent: true
      }).onOk(async () => {
        $q.loading.show({ message: 'Mengimpor produk...' })
        try {
          const response = await api.post('/api/products/batch', { products: parsedProducts })
          const { successCount, errorCount, errors } = response.data
          
          if (errorCount > 0) {
            $q.dialog({
              title: 'Hasil Impor Massal',
              message: `Berhasil mengimpor ${successCount} produk.<br/>Gagal mengimpor ${errorCount} produk.<br/><br/><strong>Detail Error:</strong><br/><div class="text-caption text-red" style="max-height: 150px; overflow-y: auto; text-align: left;">${errors.join('<br/>')}</div>`,
              html: true,
              ok: { label: 'Tutup', color: 'primary' }
            })
          } else {
            $q.notify({
              type: 'positive',
              message: `Impor massal berhasil! ${successCount} produk ditambahkan.`
            })
          }
          await loadProducts()
        } catch (error) {
          const errorMsg = error.response?.data?.error || 'Gagal mengimpor produk secara massal.'
          $q.notify({
            type: 'negative',
            message: errorMsg
          })
        } finally {
          $q.loading.hide()
        }
      })
    } catch (err) {
      $q.notify({
        type: 'negative',
        message: 'Gagal membaca/memformat file CSV. Pastikan format file Anda benar.'
      })
    }
  }
  reader.readAsText(file)
  event.target.value = ''
}

function parseCSV(text) {
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = cleanText.split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''))
  const result = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Basic splitter supporting quoted fields
    const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',')
    const cleanFields = matches.map(f => f.trim().replace(/^["']|["']$/g, ''))

    const product = {}
    headers.forEach((header, index) => {
      const val = cleanFields[index] || ''
      const normalizedHeader = header.toLowerCase()
      
      if (normalizedHeader === 'barcode') product.barcode = val || null
      else if (normalizedHeader === 'name' || normalizedHeader === 'nama') product.name = val
      else if (normalizedHeader === 'description' || normalizedHeader === 'deskripsi') product.description = val
      else if (normalizedHeader === 'stock' || normalizedHeader === 'stok') product.stock = parseInt(val) || 0
      else if (normalizedHeader === 'minstock' || normalizedHeader === 'stokminimal') product.minStock = parseInt(val) || 5
      else if (normalizedHeader === 'costprice' || normalizedHeader === 'hargabeli' || normalizedHeader === 'modal') product.costPrice = parseFloat(val) || 0
      else if (normalizedHeader === 'sellprice' || normalizedHeader === 'hargajual') product.sellPrice = parseFloat(val) || 0
      else if (normalizedHeader === 'unit' || normalizedHeader === 'satuan') product.unit = val || 'pcs'
      else if (normalizedHeader === 'category' || normalizedHeader === 'kategori') product.category = val || 'Lainnya'
    })

    if (product.name) {
      result.push(product)
    }
  }
  return result
}

// ================= CAMERA SCANNER LOGIC =================

async function startScanning(target) {
  scanTarget = target
  showScannerDialog.value = true
  
  // Wait for dialog DOM transition
  await nextTick()
  
  setTimeout(() => {
    html5QrCode = new Html5Qrcode("qr-reader")
    const config = { 
      fps: 10, 
      qrbox: (width, height) => {
        // Square shape supporting both 1D Barcode & 2D QR Code
        const size = Math.min(width * 0.7, height * 0.7, 240)
        return { width: size, height: size }
      }
    }

    html5QrCode.start(
      { facingMode: "environment" }, // back camera
      config,
      async (decodedText) => {
        if (scanTarget === 'form') {
          form.value.barcode = decodedText
        } else if (scanTarget === 'search') {
          searchQuery.value = decodedText
          await loadProducts()
        }
        
        $q.notify({
          type: 'positive',
          message: `Barcode terdeteksi: ${decodedText}`,
          timeout: 1000
        })
        
        showScannerDialog.value = false
      },
      () => {
        // Continuous scan feedback, ignore failures
      }
    ).catch(err => {
      console.error("Camera access failed:", err)
      $q.notify({
        type: 'negative',
        message: 'Gagal mengakses kamera. Pastikan izin kamera diberikan.'
      })
      showScannerDialog.value = false
    })
  }, 350)
}

async function handleScannerDialogHide() {
  if (html5QrCode) {
    if (html5QrCode.isScanning) {
      try {
        await html5QrCode.stop()
      } catch (err) {
        console.error("Failed to stop scanner", err)
      }
    }
    html5QrCode = null
  }
}
</script>

<style lang="scss" scoped>
.product-card {
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  background-color: #ffffff;
  
  .body--dark & {
    background-color: #1d1d1d;
    border-color: rgba(255, 255, 255, 0.05);
  }
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

.dark-text {
  .body--dark & {
    color: #f5f5f5 !important;
  }
}

.leading-tight {
  line-height: 1.25;
}

.rounded-borders {
  border-radius: 8px;
}

// Adjust video size inside qr-reader container
#qr-reader {
  ::v-deep(video) {
    object-fit: cover !important;
    width: 100% !important;
    height: 220px !important;
  }
}
</style>
