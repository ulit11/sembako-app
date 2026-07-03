<template>
  <q-layout>
    <q-page-container>
      <q-page class="flex flex-center bg-register-page q-pa-md">
        <div class="full-width max-auth-width">
          <!-- App Header -->
          <div class="text-center q-mb-lg">
            <!-- Custom Premium SVG Logo -->
            <rms-logo size="72px" class="q-mx-auto q-mb-md" />
            <h1 class="text-h5 text-weight-bold text-grey-9 dark-text q-ma-none">Daftar RMS Sembako</h1>
            <p class="text-caption text-grey-6 dark-grey-text q-mt-xs q-mb-none">Mulai kelola stok toko Rosi Malaju Sentosa</p>
          </div>

          <!-- Register Card -->
          <q-card class="auth-card shadow-12 q-pa-lg">
            <q-card-section class="q-pa-none q-mb-lg">
              <h2 class="text-h6 text-weight-bold text-grey-9 dark-text q-ma-none">Buat Akun Owner</h2>
              <p class="text-caption text-grey-6 dark-grey-text q-mt-xs q-mb-none">Lengkapi formulir di bawah ini</p>
            </q-card-section>

            <!-- Form fields -->
            <q-card-section class="q-pa-none">
              <q-form @submit="handleRegisterRequest" class="q-gutter-y-sm">
                <!-- Name -->
                <q-input
                  v-model="name"
                  label="Nama Lengkap"
                  outlined
                  dense
                  placeholder="Masukkan nama Anda"
                  :rules="[
                    val => !!val || 'Nama lengkap wajib diisi',
                    val => val.length >= 3 || 'Nama minimal 3 karakter'
                  ]"
                >
                  <template v-slot:prepend>
                    <q-icon name="person" color="grey-6" />
                  </template>
                </q-input>

                <!-- Email -->
                <q-input
                  v-model="email"
                  label="Email"
                  outlined
                  dense
                  type="email"
                  placeholder="nama@email.com"
                  :rules="[
                    val => !!val || 'Email wajib diisi',
                    val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || 'Format email tidak valid'
                  ]"
                >
                  <template v-slot:prepend>
                    <q-icon name="email" color="grey-6" />
                  </template>
                </q-input>

                <!-- Password -->
                <q-input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  label="Kata Sandi"
                  outlined
                  dense
                  placeholder="Minimal 6 karakter"
                  :rules="[
                    val => !!val || 'Kata sandi wajib diisi',
                    val => val.length >= 6 || 'Kata sandi minimal 6 karakter'
                  ]"
                >
                  <template v-slot:prepend>
                    <q-icon name="lock" color="grey-6" />
                  </template>
                  <template v-slot:append>
                    <q-icon
                      :name="showPassword ? 'visibility_off' : 'visibility'"
                      class="cursor-pointer"
                      color="grey-6"
                      @click="showPassword = !showPassword"
                    />
                  </template>
                </q-input>

                <!-- Submit Button -->
                <div class="q-mt-md">
                  <q-btn
                    type="submit"
                    label="Kirim Kode Verifikasi"
                    color="primary"
                    class="full-width q-py-sm rounded-borders text-weight-bold"
                    no-caps
                    :loading="loading"
                  />
                </div>
              </q-form>
            </q-card-section>
          </q-card>

          <!-- Login Link -->
          <div class="text-center q-mt-lg">
            <span class="text-grey-7 dark-grey-text">Sudah memiliki akun? </span>
            <router-link to="/login" class="text-primary text-weight-bold text-underline">Masuk disini</router-link>
          </div>

          <!-- Copyright Footer -->
          <div class="text-center q-mt-xl text-caption text-grey-5 dark-grey-text">
            &copy; 2026 Rosi Malaju Sentosa (RMS Sembako). All Rights Reserved.
          </div>
        </div>
      </q-page>
    </q-page-container>

    <!-- OTP Verification Dialog -->
    <q-dialog v-model="showOtpDialog" persistent>
      <q-card style="width: 400px; max-width: 90vw;" class="card-surface rounded-borders">
        <q-card-section class="bg-primary text-white q-py-md">
          <div class="text-subtitle1 text-weight-bold row items-center">
            <q-icon name="mark_email_read" class="q-mr-xs" size="20px" />
            Verifikasi Email Anda
          </div>
        </q-card-section>

        <q-card-section class="q-pa-md">
          <!-- Simulated Email Box -->
          <div class="bg-blue-1 text-blue-9 q-pa-md rounded-borders border-dashed q-mb-md text-caption">
            <div class="row items-center q-mb-xs">
              <q-icon name="info" size="18px" class="q-mr-xs" />
              <strong>Simulasi Pengiriman Email:</strong>
            </div>
            Kode OTP verifikasi pendaftaran untuk email <strong class="text-primary">{{ email }}</strong> adalah <strong class="text-primary text-subtitle2">{{ simulatedOtp }}</strong>.
            (Gunakan kode ini di bawah untuk memverifikasi pendaftaran Anda).
          </div>

          <div class="text-caption text-grey-7 q-mb-md">
            Masukkan kode verifikasi OTP 6-digit yang telah dikirimkan ke email Anda untuk menyelesaikan pendaftaran.
          </div>

          <q-form @submit="handleRegisterVerify">
            <q-input
              v-model="otpCode"
              label="Kode OTP (6 Digit)"
              outlined
              dense
              placeholder="123456"
              mask="######"
              :rules="[
                val => !!val || 'Kode OTP wajib diisi',
                val => val.length === 6 || 'OTP harus terdiri dari 6 digit'
              ]"
              class="q-mb-md"
            >
              <template v-slot:prepend>
                <q-icon name="pin" />
              </template>
            </q-input>

            <div class="row justify-end q-gutter-x-sm">
              <q-btn flat label="Batal" color="grey-7" no-caps v-close-popup />
              <q-btn type="submit" label="Verifikasi & Daftar" color="primary" no-caps :loading="verifyLoading" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import RmsLogo from '../components/RmsLogo.vue'

const router = useRouter()
const $q = useQuasar()

const name = ref('')
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)

// OTP Verification state
const showOtpDialog = ref(false)
const otpCode = ref('')
const simulatedOtp = ref('')
const verifyLoading = ref(false)

async function handleRegisterRequest() {
  loading.value = true
  try {
    const res = await api.post('/api/auth/register-request', {
      name: name.value,
      email: email.value,
      password: password.value
    })
    
    simulatedOtp.value = res.data.otp // Store simulated OTP
    otpCode.value = ''
    showOtpDialog.value = true
    
    $q.notify({
      type: 'info',
      message: 'OTP verifikasi telah dibuat. Silakan lakukan verifikasi.'
    })
  } catch (error) {
    const errorMsg = error.response?.data?.error || 'Gagal mengirim kode verifikasi.'
    $q.notify({
      type: 'negative',
      message: errorMsg
    })
  } finally {
    loading.value = false
  }
}

async function handleRegisterVerify() {
  verifyLoading.value = true
  try {
    const res = await api.post('/api/auth/register-verify', {
      email: email.value,
      otp: otpCode.value
    })
    
    // Save JWT token in localStorage
    const token = res.data.token
    localStorage.setItem('token', token)
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    
    $q.notify({
      type: 'positive',
      message: 'Verifikasi berhasil! Selamat datang di RMS Sembako.'
    })
    
    showOtpDialog.value = false
    
    // Force reload/refresh context and redirect to Home
    window.location.href = '/'
  } catch (error) {
    const errorMsg = error.response?.data?.error || 'Kode verifikasi salah atau sudah kadaluarsa.'
    $q.notify({
      type: 'negative',
      message: errorMsg
    })
  } finally {
    verifyLoading.value = false
  }
}
</script>

<style lang="scss" scoped>
.bg-register-page {
  background-color: #f8f9fa;
  .body--dark & {
    background-color: #121212;
  }
}

.max-auth-width {
  max-width: 400px;
}

.auth-card {
  border-radius: 16px;
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

.dark-grey-text {
  .body--dark & {
    color: #b0b0b0 !important;
  }
}

.text-underline {
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
}

.rounded-borders {
  border-radius: 8px;
}

.border-dashed {
  border: 1px dashed rgba(25, 118, 210, 0.4);
}
</style>
