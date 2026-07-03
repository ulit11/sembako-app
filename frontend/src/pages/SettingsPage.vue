<template>
  <q-page class="q-pa-md bg-page">
    <div class="row justify-between items-center q-mb-md">
      <div class="text-h6 text-weight-bold text-grey-9 dark-text">Pengaturan Toko</div>
    </div>

    <q-card class="shadow-1 rounded-borders card-surface q-mb-md">
      <q-card-section class="q-pb-none">
        <div class="text-subtitle1 text-weight-bold text-grey-9 dark-text row items-center">
          <q-icon name="storefront" color="primary" class="q-mr-xs" size="20px" />
          Detail & Identitas Toko
        </div>
      </q-card-section>

      <q-card-section class="q-pa-md">
        <q-form @submit="handleSaveSettings" class="q-gutter-y-sm">
          <!-- Owner Name -->
          <q-input
            v-model="form.name"
            label="Nama Pemilik / Toko *"
            outlined
            dense
            placeholder="Contoh: Toko Sembako Agung"
            :rules="[val => !!val || 'Nama pemilik/toko wajib diisi']"
          >
            <template v-slot:prepend>
              <q-icon name="store" />
            </template>
          </q-input>

          <!-- Email (Readonly) -->
          <q-input
            v-model="form.email"
            label="Email Login (Tidak Dapat Diubah)"
            outlined
            dense
            readonly
            disable
          >
            <template v-slot:prepend>
              <q-icon name="email" />
            </template>
          </q-input>

          <q-separator class="q-my-md opacity-50" />

          <!-- Bank Transfer Settings -->
          <div class="text-subtitle2 text-weight-bold text-grey-8 dark-text q-mb-xs">
            <q-icon name="account_balance" color="primary" class="q-mr-xs" size="18px" />
            Informasi Rekening Bank (Untuk Pembayaran Transfer)
          </div>
          <div class="text-caption text-grey-6 q-mb-md">
            Informasi di bawah ini akan ditampilkan ke pembeli saat memilih metode bayar Transfer Bank di kasir.
          </div>

          <q-input
            v-model="form.bankName"
            label="Nama Bank"
            outlined
            dense
            placeholder="Contoh: BCA, Mandiri, BRI"
          />

          <q-input
            v-model="form.bankAccount"
            label="Nomor Rekening"
            outlined
            dense
            placeholder="Contoh: 8001234567"
          />

          <q-input
            v-model="form.bankAccountName"
            label="Pemilik Rekening (Atas Nama)"
            outlined
            dense
            placeholder="Contoh: Agung Prasetyo"
          />

          <q-separator class="q-my-md opacity-50" />

          <!-- QRIS Settings -->
          <div class="text-subtitle2 text-weight-bold text-grey-8 dark-text q-mb-xs">
            <q-icon name="qr_code_2" color="primary" class="q-mr-xs" size="18px" />
            Custom QRIS Toko
          </div>
          <div class="text-caption text-grey-6 q-mb-md">
            Unggah foto/gambar kode QRIS milik toko Anda. Jika kosong, kasir akan menggunakan QRIS dinamis bawaan sistem.
          </div>

          <!-- QRIS Image Upload File selector -->
          <div class="row q-col-gutter-md items-center">
            <div class="col-xs-12 col-sm-6 text-center">
              <div v-if="form.qrisImage" class="qris-preview-box rounded-borders q-pa-sm border-dashed">
                <q-img
                  :src="form.qrisImage"
                  style="max-width: 180px; height: auto; max-height: 180px;"
                  alt="Preview QRIS"
                  class="rounded-borders shadow-1"
                />
                <div class="q-mt-sm">
                  <q-btn
                    flat
                    dense
                    color="negative"
                    icon="delete"
                    label="Hapus QRIS"
                    no-caps
                    size="sm"
                    @click="handleRemoveQrisImage"
                  />
                </div>
              </div>
              <div v-else class="qris-placeholder-box rounded-borders q-pa-lg flex flex-center column text-grey-5 border-dashed">
                <q-icon name="qr_code" size="48px" />
                <span class="text-caption q-mt-xs">Belum ada QRIS kustom diunggah</span>
              </div>
            </div>

            <div class="col-xs-12 col-sm-6">
              <q-file
                v-model="selectedFile"
                label="Pilih Foto/Gambar QRIS"
                outlined
                dense
                accept="image/*"
                @update:model-value="onFileSelected"
              >
                <template v-slot:prepend>
                  <q-icon name="cloud_upload" />
                </template>
              </q-file>
              <div class="text-caption text-grey-5 q-mt-xs">
                Format file: JPG, PNG. Maksimal 2MB.
              </div>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="row justify-end q-mt-xl">
            <q-btn
              type="submit"
              color="primary"
              label="Simpan Perubahan"
              class="q-px-lg rounded-borders text-weight-bold"
              no-caps
              :loading="saving"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '../stores/authStore'
import { api } from '../boot/axios'

const $q = useQuasar()
const authStore = useAuthStore()

const saving = ref(false)
const selectedFile = ref(null)

const form = ref({
  name: '',
  email: '',
  bankName: '',
  bankAccount: '',
  bankAccountName: '',
  qrisImage: ''
})

onMounted(() => {
  // Load current owner info
  if (authStore.user) {
    form.value = {
      name: authStore.user.name || '',
      email: authStore.user.email || '',
      bankName: authStore.user.bankName || '',
      bankAccount: authStore.user.bankAccount || '',
      bankAccountName: authStore.user.bankAccountName || '',
      qrisImage: authStore.user.qrisImage || ''
    }
  }
})

// Convert selected file to base64
function onFileSelected(file) {
  if (!file) return

  // Check file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    $q.notify({
      type: 'negative',
      message: 'Ukuran file terlalu besar! Maksimal adalah 2MB.'
    })
    selectedFile.value = null
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    form.value.qrisImage = e.target.result
  }
  reader.readAsDataURL(file)
}

function handleRemoveQrisImage() {
  form.value.qrisImage = ''
  selectedFile.value = null
  $q.notify({
    type: 'info',
    message: 'Gambar QRIS dihapus sementara. Klik Simpan untuk memperbarui.'
  })
}

async function handleSaveSettings() {
  saving.value = true
  try {
    const payload = {
      name: form.value.name,
      bankName: form.value.bankName || null,
      bankAccount: form.value.bankAccount || null,
      bankAccountName: form.value.bankAccountName || null,
      qrisImage: form.value.qrisImage || null
    }

    const res = await api.put('/api/auth/settings', payload)
    
    // Update local user state in store
    authStore.user = res.data.user
    
    $q.notify({
      type: 'positive',
      message: 'Pengaturan toko berhasil diperbarui!'
    })
  } catch (error) {
    const errorMsg = error.response?.data?.error || 'Gagal memperbarui pengaturan.'
    $q.notify({
      type: 'negative',
      message: errorMsg
    })
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
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

.rounded-borders {
  border-radius: 12px;
}

.border-dashed {
  border: 1px dashed rgba(0, 0, 0, 0.12);
  .body--dark & {
    border-color: rgba(255, 255, 255, 0.12);
  }
}

.qris-preview-box, .qris-placeholder-box {
  background-color: #fafafa;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  
  .body--dark & {
    background-color: #2a2a2a;
  }
}
</style>
