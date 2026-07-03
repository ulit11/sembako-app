<template>
  <q-page class="q-pa-md bg-page column no-wrap">
    <!-- Header -->
    <div class="row justify-between items-center q-mb-md">
      <div class="text-h6 text-weight-bold text-grey-9 dark-text">Kasir Toko (POS)</div>
      <q-btn
        v-if="cart.length > 0"
        flat
        color="negative"
        icon="delete_sweep"
        label="Kosongkan"
        no-caps
        dense
        @click="confirmClearCart"
      />
    </div>

    <!-- Product Search & Add Area -->
    <q-card class="q-mb-md shadow-1 rounded-borders card-surface">
      <q-card-section class="q-pa-sm q-gutter-y-xs">
        <q-input
          v-model="searchQuery"
          dense
          outlined
          placeholder="Ketik nama sembako / scan barcode..."
          clearable
          @update:model-value="searchProducts"
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
              @click="startScanning"
            >
              <q-tooltip>Scan Barcode dengan Kamera</q-tooltip>
            </q-btn>
          </template>
        </q-input>

        <!-- Search Results Dropdown -->
        <q-list
          v-if="searchResults.length > 0"
          bordered
          separator
          class="rounded-borders q-mt-xs bg-white dark-bg-grey scroll"
          style="max-height: 200px;"
        >
          <q-item
            v-for="prod in searchResults"
            :key="prod.id"
            clickable
            v-ripple
            :disabled="prod.stock <= 0"
            @click="addProductToCart(prod)"
          >
            <q-item-section>
              <q-item-label class="text-weight-bold">{{ prod.name }}</q-item-label>
              <q-item-label caption>
                Kategori: {{ prod.category }} | Unit: {{ prod.unit }} | Barcode: {{ prod.barcode || '-' }}
              </q-item-label>
            </q-item-section>
            <q-item-section side class="text-right">
              <q-item-label class="text-primary text-weight-bold">{{ formatRupiah(prod.sellPrice) }}</q-item-label>
              <q-item-label caption :class="prod.stock <= prod.minStock ? 'text-amber-9 text-weight-bold' : ''">
                Stok: {{ prod.stock }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>

    <!-- Cart Items Area -->
    <div class="col scroll q-mb-md" style="min-height: 150px;">
      <div v-if="cart.length === 0" class="text-center q-py-xl text-grey-6 flex flex-center column">
        <q-icon name="shopping_cart" size="64px" class="q-mb-md opacity-40" />
        <div class="text-subtitle1 text-weight-medium">Keranjang Belanja Kosong</div>
        <div class="text-caption">Scan barcode produk sembako atau gunakan pencarian di atas untuk mulai menambahkan barang belanjaan.</div>
      </div>

      <div v-else class="q-gutter-y-sm">
        <q-card
          v-for="item in cart"
          :key="item.product.id"
          class="cart-card shadow-1 rounded-borders card-surface"
        >
          <q-card-section class="q-pa-sm">
            <div class="row justify-between items-center no-wrap">
              <div class="col-6">
                <div class="text-subtitle2 text-weight-bold text-grey-9 dark-text leading-tight">
                  {{ item.product.name }}
                </div>
                <div class="text-caption text-grey-6">
                  {{ formatRupiah(item.product.sellPrice) }} / {{ item.product.unit }}
                </div>
              </div>

              <!-- Quantity Controls -->
              <div class="col-4 flex items-center justify-center no-wrap">
                <q-btn
                  flat
                  round
                  dense
                  color="grey-7"
                  icon="remove"
                  size="sm"
                  @click="decreaseQty(item)"
                />
                <span class="q-mx-sm text-weight-bold text-subtitle2">{{ item.quantity }}</span>
                <q-btn
                  flat
                  round
                  dense
                  color="primary"
                  icon="add"
                  size="sm"
                  :disabled="item.quantity >= item.product.stock"
                  @click="increaseQty(item)"
                />
              </div>

              <!-- Item Total and Delete -->
              <div class="col-2 text-right">
                <div class="text-subtitle2 text-weight-bold text-primary">
                  {{ formatRupiah(item.product.sellPrice * item.quantity) }}
                </div>
                <q-btn
                  flat
                  round
                  dense
                  color="negative"
                  icon="delete"
                  size="xs"
                  @click="removeFromCart(item.product.id)"
                />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Checkout Panel (Bottom Fixed-like) -->
    <q-card v-if="cart.length > 0" class="shadow-3 rounded-borders card-surface q-mt-auto">
      <q-card-section class="q-pa-md">
        <!-- Subtotal -->
        <div class="row justify-between items-center q-mb-md">
          <div class="text-subtitle1 text-weight-medium text-grey-8 dark-text">Total Belanja:</div>
          <div class="text-h5 text-weight-bold text-primary">
            {{ formatRupiah(cartTotal) }}
          </div>
        </div>

        <!-- Payment Method Selection -->
        <div class="text-subtitle2 text-grey-7 q-mb-sm">Metode Pembayaran:</div>
        <div class="row q-col-gutter-xs q-mb-md">
          <div v-for="method in paymentMethods" :key="method.value" class="col-4">
            <q-btn
              class="full-width rounded-borders text-weight-bold"
              :color="paymentMethod === method.value ? 'primary' : 'grey-3'"
              :text-color="paymentMethod === method.value ? 'white' : 'grey-9'"
              :label="method.label"
              no-caps
              dense
              unevaluated
              @click="setPaymentMethod(method.value)"
            />
          </div>
        </div>

        <!-- Conditional Fields -->
        <q-form ref="checkoutForm" class="q-gutter-y-sm">
          <!-- QRIS / Bon Cashless details -->
          <div v-if="paymentMethod === 'Bon'">
            <q-input
              v-model="customerName"
              label="Nama Pelanggan (Wajib) *"
              outlined
              dense
              placeholder="Contoh: Bu Ani RT 02"
              :rules="[val => !!val && val.trim() !== '' || 'Nama pelanggan wajib diisi untuk catatan Bon']"
            >
              <template v-slot:prepend>
                <q-icon name="person" />
              </template>
            </q-input>
          </div>

          <!-- Cash Payment (Tunai) Calculator -->
          <div v-if="paymentMethod === 'Tunai'" class="q-gutter-y-sm">
            <q-input
              v-model.number="amountPaid"
              type="number"
              label="Uang Dibayar (Rp) *"
              outlined
              dense
              prefix="Rp"
              :rules="[
                val => val !== null && val >= 0 || 'Uang dibayar tidak boleh kosong',
                val => val >= cartTotal || 'Uang dibayar kurang dari total belanja'
              ]"
            >
              <template v-slot:prepend>
                <q-icon name="payments" />
              </template>
            </q-input>

            <!-- Quick Cash Buttons -->
            <div class="row q-col-gutter-xs">
              <div v-for="cash in quickCashOptions" :key="cash" class="col-4">
                <q-btn
                  outline
                  dense
                  no-caps
                  color="grey-7"
                  class="full-width rounded-borders text-caption text-weight-medium"
                  :label="cash === 'pas' ? 'Uang Pas' : formatRupiah(cash)"
                  @click="applyQuickCash(cash)"
                />
              </div>
            </div>

            <!-- Change display -->
            <div class="row justify-between items-center q-mt-md bg-green-1 q-pa-sm rounded-borders border-green border-dashed">
              <span class="text-caption text-green-9 text-weight-medium">Uang Kembalian:</span>
              <span class="text-subtitle1 text-weight-bold text-green-9">
                {{ formatRupiah(amountChange) }}
              </span>
            </div>
          </div>
        </q-form>

        <!-- Submit Button -->
        <q-btn
          color="positive"
          label="Selesaikan Pembayaran"
          class="full-width q-py-sm rounded-borders text-weight-bold q-mt-md"
          no-caps
          icon="check_circle"
          :loading="transactionStore.loading"
          @click="handleCheckout"
        />
      </q-card-section>
    </q-card>

    <!-- Non-Tunai Payment (QRIS & Transfer) Pending Dialog -->
    <q-dialog v-model="showPendingModal" persistent>
      <q-card style="width: 380px; max-width: 95vw;" class="rounded-borders card-surface q-pa-md text-center">
        <q-card-section class="q-pb-none">
          <div class="text-subtitle1 text-weight-bold text-grey-9 dark-text">
            {{ paymentMethod === 'QRIS' ? 'Pembayaran QRIS' : 'Transfer Bank' }}
          </div>
          <div class="text-caption text-grey-6">
            {{ paymentMethod === 'QRIS' ? 'Silakan scan kode QRIS Toko Sembako di bawah ini' : 'Silakan transfer ke rekening toko di bawah ini' }}
          </div>
        </q-card-section>

        <q-card-section class="q-py-md flex flex-center column">
          <!-- QRIS Section -->
          <div v-if="paymentMethod === 'QRIS'" class="column items-center full-width">
            <!-- Custom QRIS Image or Fallback QR Code -->
            <q-img
              :src="authStore.user?.qrisImage || qrisQrUrl"
              spinner-color="primary"
              style="width: 220px; height: 220px; border: 1px solid #eee; border-radius: 8px;"
              class="q-mb-md"
            />
            <div class="text-subtitle2 text-weight-bold text-grey-9 dark-text">{{ authStore.user?.storeName || 'TOKO SEMBAKO' }}</div>
            <div class="text-caption text-grey-6">NMID: ID10203040506001</div>
          </div>

          <!-- Transfer Bank Section -->
          <div v-else-if="paymentMethod === 'Transfer'" class="full-width q-gutter-y-sm text-left">
            <div v-if="authStore.user?.bankName" class="bg-blue-1 text-blue-9 q-pa-md rounded-borders border-dashed" style="border-width: 1px;">
              <div class="q-mb-xs">
                <span class="text-caption block text-grey-6">Nama Bank:</span>
                <span class="text-subtitle2 text-weight-bold text-grey-9 dark-text">{{ authStore.user.bankName }}</span>
              </div>
              <div class="q-mb-xs row items-center justify-between no-wrap">
                <div>
                  <span class="text-caption block text-grey-6">Nomor Rekening:</span>
                  <span class="text-subtitle2 text-weight-bold text-primary">{{ authStore.user.bankAccount }}</span>
                </div>
                <q-btn
                  flat
                  round
                  dense
                  color="primary"
                  icon="content_copy"
                  size="sm"
                  @click="copyText(authStore.user.bankAccount)"
                >
                  <q-tooltip>Salin Rekening</q-tooltip>
                </q-btn>
              </div>
              <div>
                <span class="text-caption block text-grey-6">Atas Nama (A/N):</span>
                <span class="text-subtitle2 text-weight-bold text-grey-9 dark-text">{{ authStore.user.bankAccountName }}</span>
              </div>
            </div>
            <div v-else class="text-center text-amber-9 q-pa-md bg-amber-1 rounded-borders full-width">
              <q-icon name="warning" size="28px" class="q-mb-xs" />
              <div class="text-caption text-weight-bold">Informasi Rekening Belum Diatur</div>
              <div class="text-caption" style="font-size: 11px;">Minta Owner untuk mengatur bank di menu Pengaturan.</div>
            </div>
          </div>
          
          <q-separator class="q-my-md full-width opacity-50" />

          <div class="text-subtitle2 text-grey-7">Total yang Harus Dibayar:</div>
          <div class="text-h5 text-weight-bold text-primary q-mt-xs">
            {{ formatRupiah(cartTotal) }}
          </div>
        </q-card-section>

        <!-- Status Polling Indicator -->
        <q-card-section class="q-py-xs bg-grey-1 dark-bg-grey rounded-borders row items-center justify-center q-gutter-x-sm">
          <q-spinner-oval color="primary" size="20px" />
          <span class="text-caption text-weight-medium text-grey-8 dark-text">Menunggu dana masuk ke rekening...</span>
        </q-card-section>

        <q-card-actions align="center" class="q-mt-md q-gutter-x-sm row no-wrap full-width">
          <q-btn
            outline
            color="negative"
            label="Batal / Cancel"
            class="col-6 rounded-borders text-weight-bold"
            no-caps
            @click="handleCancelQris"
          />
          <q-btn
            color="primary"
            label="Simulasi Sukses"
            class="col-6 rounded-borders text-weight-bold"
            no-caps
            icon="bolt"
            @click="simulateQrisPayment"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>


    <!-- Camera Scanner Dialog -->
    <q-dialog v-model="showScannerDialog" persistent @hide="handleScannerDialogHide">
      <q-card style="width: 350px; max-width: 90vw;" class="card-surface rounded-borders">
        <q-card-section class="bg-primary text-white q-py-md row items-center justify-between">
          <div class="text-subtitle1 text-weight-bold row items-center">
            <q-icon name="photo_camera" class="q-mr-xs" size="20px" />
            Scan Barcode Belanjaan
          </div>
          <q-btn flat round dense icon="close" color="white" v-close-popup />
        </q-card-section>

        <q-card-section class="q-pa-md flex flex-center">
          <div id="pos-reader" style="width: 100%; border-radius: 8px; overflow: hidden; border: 1px solid #ccc;"></div>
        </q-card-section>

        <q-card-section class="q-pa-md text-center text-caption text-grey-6 q-pt-none">
          Posisikan barcode sembako di dalam kotak scanner kamera.
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Receipt / Success Dialog -->
    <q-dialog v-model="showReceiptDialog">
      <q-card style="width: 380px; max-width: 95vw;" class="rounded-borders card-surface q-pa-md">
        <!-- Receipt Header -->
        <div class="text-center q-mb-md">
          <q-avatar size="44px" color="green-1" text-color="green-9" class="q-mb-xs">
            <q-icon name="receipt_long" size="28px" />
          </q-avatar>
          <div class="text-h6 text-weight-bold text-grey-9 dark-text">TRANSAKSI SUKSES</div>
          <div class="text-caption text-grey-5">SembakoApp - Struk Pembayaran</div>
          <div class="text-caption text-grey-5">{{ formatDateTime(receipt.createdAt) }}</div>
        </div>

        <q-separator class="q-my-sm" style="border-style: dashed;" />

        <!-- Info -->
        <div class="text-caption q-mb-sm text-grey-8 dark-text">
          <div class="row justify-between">
            <span>Metode:</span>
            <span class="text-weight-bold text-primary">{{ receipt.paymentMethod }}</span>
          </div>
          <div v-if="receipt.paymentMethod === 'Bon'" class="row justify-between">
            <span>Pelanggan:</span>
            <span class="text-weight-bold text-amber-9">{{ receipt.customerName }}</span>
          </div>
          <div class="row justify-between">
            <span>Kasir / Owner:</span>
            <span>{{ authStore.user?.name }}</span>
          </div>
        </div>

        <q-separator class="q-my-sm" style="border-style: dashed;" />

        <!-- Items list -->
        <div class="q-my-md">
          <div v-for="item in receipt.items" :key="item.id" class="row justify-between items-center text-caption q-mb-xs text-grey-9 dark-text">
            <div class="col-7">
              <div>{{ item.product.name }}</div>
              <div class="text-grey-5">{{ item.quantity }} x {{ formatRupiah(item.price) }}</div>
            </div>
            <div class="col-5 text-right text-weight-bold">
              {{ formatRupiah(item.price * item.quantity) }}
            </div>
          </div>
        </div>

        <q-separator class="q-my-sm" style="border-style: dashed;" />

        <!-- Summary -->
        <div class="q-mt-sm text-grey-9 dark-text">
          <div class="row justify-between text-subtitle2 text-weight-bold">
            <span>Total Belanja:</span>
            <span>{{ formatRupiah(receipt.totalPrice) }}</span>
          </div>
          <div v-if="receipt.paymentMethod === 'Tunai'" class="q-gutter-y-xs text-caption q-mt-xs">
            <div class="row justify-between">
              <span>Uang Dibayar:</span>
              <span>{{ formatRupiah(receipt.amountPaid) }}</span>
            </div>
            <div class="row justify-between text-green-8 text-weight-bold">
              <span>Uang Kembalian:</span>
              <span>{{ formatRupiah(receipt.amountChange) }}</span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <q-card-actions align="center" class="q-mt-lg q-pa-none">
          <q-btn
            color="primary"
            label="Selesai"
            class="full-width rounded-borders text-weight-bold"
            no-caps
            v-close-popup
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, nextTick, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import { useProductStore } from '../stores/productStore'
import { useTransactionStore } from '../stores/transactionStore'
import { useAuthStore } from '../stores/authStore'
import { storeToRefs } from 'pinia'
import { Html5Qrcode } from 'html5-qrcode'

const $q = useQuasar()
const productStore = useProductStore()
const transactionStore = useTransactionStore()
const authStore = useAuthStore()

const { cart } = storeToRefs(transactionStore)
const cartTotal = computed(() => transactionStore.cartTotal)

const searchQuery = ref('')
const searchResults = ref([])
const paymentMethod = ref('Tunai')
const customerName = ref('')

// Non-tunai pending payment states
const showPendingModal = ref(false)
const pendingTransactionId = ref(null)
const pollingInterval = ref(null)
const qrisQrUrl = ref('')
const backupCartData = ref([])

function copyText(text) {
  navigator.clipboard.writeText(text)
  $q.notify({
    type: 'positive',
    message: 'Nomor rekening berhasil disalin!',
    timeout: 1000
  })
}

function getQrisQrUrl(amount) {
  const amtStr = String(Math.round(amount))
  const lenStr = String(amtStr.length).padStart(2, '0')
  // Dynamic realistic QRIS data encoding the actual amount
  const qrisBase = `00020101021226540014ID102030405060010303UMI51440014ID202412345678020412340303UMI52045411530336054${lenStr}${amtStr}5802ID5918Toko Sembako Agung6009Tangerang62070703***6304`
  return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrisBase)}`
}

function startQrisPolling(transactionId, backupCart, checkoutRes) {
  stopQrisPolling()
  pollingInterval.value = setInterval(async () => {
    try {
      const resStatus = await api.get(`/api/transactions/${transactionId}/status`)
      if (resStatus.data.status === 'SUCCESS') {
        stopQrisPolling()
        
        receipt.value = {
          createdAt: checkoutRes.createdAt,
          paymentMethod: checkoutRes.paymentMethod,
          customerName: checkoutRes.customerName || '',
          totalPrice: checkoutRes.totalPrice,
          items: checkoutRes.items,
          amountPaid: checkoutRes.totalPrice,
          amountChange: 0
        }
        
        showPendingModal.value = false
        
        $q.notify({
          type: 'positive',
          message: `Pembayaran ${checkoutRes.paymentMethod} Diterima! Transaksi Sukses.`
        })
        
        showReceiptDialog.value = true
      }
    } catch (err) {
      console.error("Polling error:", err)
    }
  }, 2000)
}

function stopQrisPolling() {
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value)
    pollingInterval.value = null
  }
}

async function handleCancelQris() {
  $q.loading.show({ message: 'Membatalkan transaksi...' })
  try {
    stopQrisPolling()
    await api.delete(`/api/transactions/${pendingTransactionId.value}/cancel`)
    
    // Restore cart items
    transactionStore.cart = backupCartData.value
    
    showPendingModal.value = false
    pendingTransactionId.value = null
    
    $q.notify({
      type: 'info',
      message: 'Transaksi dibatalkan. Stok dikembalikan.'
    })
  } catch (err) {
    console.error("Cancel failed:", err)
    $q.notify({
      type: 'negative',
      message: 'Gagal membatalkan transaksi di server.'
    })
  } finally {
    $q.loading.hide()
  }
}

async function simulateQrisPayment() {
  try {
    await api.post(`/api/transactions/${pendingTransactionId.value}/simulate-pay`)
    $q.notify({
      type: 'info',
      message: 'Sinyal simulasi pembayaran sukses dikirim.'
    })
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: 'Gagal mengirim sinyal simulasi pembayaran.'
    })
  }
}

onUnmounted(() => {
  stopQrisPolling()
})
const amountPaid = ref(null)

const showScannerDialog = ref(false)
let html5QrCode = null

const showReceiptDialog = ref(false)
const receipt = ref({
  createdAt: '',
  paymentMethod: '',
  customerName: '',
  totalPrice: 0,
  items: [],
  amountPaid: 0,
  amountChange: 0
})

const checkoutForm = ref(null)

const paymentMethods = [
  { label: 'Tunai / Cash', value: 'Tunai' },
  { label: 'QRIS Cashless', value: 'QRIS' },
  { label: 'Transfer Bank', value: 'Transfer' },
  { label: 'Bon / Utang', value: 'Bon' }
]

const quickCashOptions = computed(() => {
  const total = cartTotal.value
  const options = ['pas']
  
  const standardBills = [5000, 10000, 20000, 50000, 100000]
  for (const bill of standardBills) {
    if (bill > total) {
      options.push(bill)
    }
  }
  
  // limit to 3 quick options
  return options.slice(0, 3)
})

const amountChange = computed(() => {
  if (!amountPaid.value || amountPaid.value < cartTotal.value) return 0
  return amountPaid.value - cartTotal.value
})

async function searchProducts() {
  if (!searchQuery.value || searchQuery.value.trim() === '') {
    searchResults.value = []
    return
  }

  try {
    // Search products in stock
    const response = await api.get('/api/products', { params: { search: searchQuery.value } })
    searchResults.value = response.data
  } catch (error) {
    console.error('Failed to search products:', error)
  }
}

function addProductToCart(product) {
  if (product.stock <= 0) {
    $q.notify({
      type: 'warning',
      message: `Barang "${product.name}" habis! Tidak bisa ditambahkan.`
    })
    return
  }

  transactionStore.addToCart(product)
  
  $q.notify({
    type: 'positive',
    message: `Menambahkan ${product.name} ke keranjang.`,
    timeout: 1000,
    position: 'bottom-right'
  })

  // Clear search
  searchQuery.value = ''
  searchResults.value = []
}

function increaseQty(item) {
  if (item.quantity < item.product.stock) {
    transactionStore.updateQuantity(item.product.id, item.quantity + 1)
  } else {
    $q.notify({
      type: 'warning',
      message: `Batas stok tersedia: ${item.product.stock} ${item.product.unit}`
    })
  }
}

function decreaseQty(item) {
  if (item.quantity > 1) {
    transactionStore.updateQuantity(item.product.id, item.quantity - 1)
  } else {
    transactionStore.removeFromCart(item.product.id)
  }
}

function removeFromCart(productId) {
  transactionStore.removeFromCart(productId)
}

function confirmClearCart() {
  $q.dialog({
    title: 'Kosongkan Keranjang',
    message: 'Apakah Anda yakin ingin mengosongkan keranjang kasir?',
    cancel: { label: 'Batal', flat: true, color: 'grey-7' },
    ok: { label: 'Kosongkan', color: 'negative', flat: true },
    persistent: true
  }).onOk(() => {
    transactionStore.clearCart()
  })
}

function setPaymentMethod(method) {
  paymentMethod.value = method
  customerName.value = ''
  amountPaid.value = null
}

function applyQuickCash(val) {
  if (val === 'pas') {
    amountPaid.value = cartTotal.value
  } else {
    amountPaid.value = val
  }
}

async function handleCheckout() {
  const formValid = checkoutForm.value ? await checkoutForm.value.validate() : true
  if (!formValid) {
    $q.notify({
      type: 'negative',
      message: 'Lengkapi validasi pembayaran terlebih dahulu.'
    })
    return
  }

  $q.loading.show({ message: 'Memproses transaksi...' })
  
  try {
    const backupCart = [...cart.value]
    const backupTotal = cartTotal.value
    const backupPaid = amountPaid.value || cartTotal.value
    const backupChange = amountChange.value
    
    backupCartData.value = backupCart
    
    const res = await transactionStore.checkout(paymentMethod.value, customerName.value)
    
    if (paymentMethod.value === 'QRIS' || paymentMethod.value === 'Transfer') {
      pendingTransactionId.value = res.id
      qrisQrUrl.value = getQrisQrUrl(res.totalPrice)
      showPendingModal.value = true
      startQrisPolling(res.id, backupCart, res)
      $q.loading.hide()
      return
    }

    // Set receipt data for Cash/Credit
    receipt.value = {
      createdAt: res.createdAt,
      paymentMethod: res.paymentMethod,
      customerName: res.customerName,
      totalPrice: backupTotal,
      items: res.items,
      amountPaid: backupPaid,
      amountChange: backupChange
    }

    $q.notify({
      type: 'positive',
      message: 'Transaksi Berhasil Diselesaikan!'
    })

    // Open receipt modal
    showReceiptDialog.value = true
    
    // Reset inputs
    customerName.value = ''
    amountPaid.value = null
  } catch (error) {
    const errorMsg = error.response?.data?.error || 'Transaksi gagal diproses.'
    $q.notify({
      type: 'negative',
      message: errorMsg
    })
  } finally {
    if (paymentMethod.value !== 'QRIS' && paymentMethod.value !== 'Transfer') {
      $q.loading.hide()
    }
  }
}

function formatRupiah(val) {
  if (!val) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(val)
}

function formatDateTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}

import { api } from '../boot/axios'

// ================= CAMERA SCANNER LOGIC =================

async function startScanning() {
  showScannerDialog.value = true
  
  // Wait for dialog DOM
  await nextTick()
  
  setTimeout(() => {
    html5QrCode = new Html5Qrcode("pos-reader")
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
        // Stop scanning immediately
        showScannerDialog.value = false // triggers handleScannerDialogHide
        
        $q.loading.show({ message: 'Mencari barang...' })
        try {
          const response = await api.get('/api/products', { params: { search: decodedText } })
          const productsFound = response.data
          
          if (productsFound.length > 0) {
            // Find exact match by barcode or first item
            const exactProduct = productsFound.find(p => p.barcode === decodedText) || productsFound[0]
            addProductToCart(exactProduct)
          } else {
            $q.notify({
              type: 'warning',
              message: `Barang dengan barcode "${decodedText}" tidak terdaftar!`
            })
          }
        } catch (err) {
          console.error("Search failed:", err)
        } finally {
          $q.loading.hide()
        }
      },
      () => {
        // Continuous scan feedback, ignore failures
      }
    ).catch(err => {
      console.error("Camera access failed:", err)
      $q.notify({
        type: 'negative',
        message: 'Gagal mengakses kamera. Berikan izin akses kamera.'
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
.cart-card {
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

.dark-bg-grey {
  .body--dark & {
    background-color: #2c2c2c !important;
  }
}

.leading-tight {
  line-height: 1.25;
}

.rounded-borders {
  border-radius: 8px;
}

#pos-reader {
  ::v-deep(video) {
    object-fit: cover !important;
    width: 100% !important;
    height: 220px !important;
  }
}

.border-green {
  border: 1px solid rgba(46, 117, 89, 0.3);
}

.border-dashed {
  border-style: dashed;
}
</style>
