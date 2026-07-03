<template>
  <q-layout>
    <q-page-container>
      <q-page class="flex flex-center bg-login-page q-pa-md">
        <div class="full-width max-auth-width">
          <!-- App Logo / Title Header -->
          <div class="text-center q-mb-xl">
            <!-- Custom Premium SVG Logo -->
            <rms-logo size="80px" class="q-mx-auto q-mb-md" />
            <h1 class="text-h4 text-weight-bold text-grey-9 dark-text q-ma-none">RMS Sembako</h1>
            <p class="text-subtitle1 text-grey-6 dark-grey-text q-mt-xs q-mb-none">Rosi Malaju Sentosa</p>
          </div>

          <!-- Login Card -->
          <q-card class="auth-card shadow-12 q-pa-lg">
            <q-card-section class="q-pa-none q-mb-lg">
              <h2 class="text-h5 text-weight-bold text-grey-9 dark-text q-ma-none">Masuk</h2>
              <p class="text-caption text-grey-6 dark-grey-text q-mt-xs q-mb-none">Silakan masuk ke akun Anda</p>
            </q-card-section>

            <!-- Form fields -->
            <q-card-section class="q-pa-none">
              <q-form @submit="handleLogin" class="q-gutter-y-sm">
                <!-- Identifier (Email or Username) -->
                <q-input
                  v-model="identifier"
                  label="Email atau Nama Pengguna"
                  outlined
                  dense
                  placeholder="Masukkan email atau nama lengkap"
                  :rules="[
                    val => !!val || 'Email atau nama pengguna wajib diisi',
                    val => val.length >= 3 || 'Terlalu pendek, minimal 3 karakter'
                  ]"
                >
                  <template v-slot:prepend>
                    <q-icon name="person" color="grey-6" />
                  </template>
                </q-input>

                <!-- Password -->
                <q-input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  label="Kata Sandi"
                  outlined
                  dense
                  :rules="[val => !!val || 'Kata sandi wajib diisi']"
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

                <!-- Forgot Password Action link -->
                <div class="row justify-end q-mt-xs">
                  <q-btn
                    flat
                    dense
                    color="primary"
                    label="Lupa Kata Sandi?"
                    class="text-weight-bold"
                    no-caps
                    size="sm"
                    @click="openForgotPasswordDialog"
                  />
                </div>

                <!-- Submit Button -->
                <div class="q-mt-md">
                  <q-btn
                    type="submit"
                    label="Masuk"
                    color="primary"
                    class="full-width q-py-sm rounded-borders text-weight-bold"
                    no-caps
                    :loading="loading"
                  />
                </div>
              </q-form>
            </q-card-section>
          </q-card>

          <!-- Register Link -->
          <div class="text-center q-mt-lg">
            <span class="text-grey-7 dark-grey-text">Belum punya akun? </span>
            <router-link to="/register" class="text-primary text-weight-bold text-underline">Daftar sekarang</router-link>
          </div>

          <!-- Copyright Footer -->
          <div class="text-center q-mt-xl text-caption text-grey-5 dark-grey-text">
            &copy; 2026 Rosi Malaju Sentosa (RMS Sembako). All Rights Reserved.
          </div>
        </div>
      </q-page>
    </q-page-container>

    <!-- Forgot Password Dialog -->
    <q-dialog v-model="showForgotDialog" persistent>
      <q-card style="width: 400px; max-width: 90vw;" class="card-surface rounded-borders">
        <q-card-section class="bg-primary text-white q-py-md">
          <div class="text-subtitle1 text-weight-bold row items-center">
            <q-icon name="lock_reset" class="q-mr-xs" size="20px" />
            Lupa Kata Sandi
          </div>
        </q-card-section>

        <!-- Step 1: Input Email to Request OTP -->
        <q-card-section v-if="forgotStep === 1" class="q-pa-md">
          <div class="text-caption text-grey-7 q-mb-md">
            Masukkan alamat email akun Anda. Kami akan mengirimkan kode verifikasi OTP (simulasi) untuk mereset kata sandi Anda.
          </div>
          <q-form @submit="handleRequestReset">
            <q-input
              v-model="forgotEmail"
              label="Email Terdaftar"
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
                <q-icon name="email" />
              </template>
            </q-input>

            <div class="row justify-end q-gutter-x-sm q-mt-md">
              <q-btn flat label="Batal" color="grey-7" no-caps v-close-popup />
              <q-btn type="submit" label="Kirim OTP" color="primary" no-caps :loading="forgotLoading" />
            </div>
          </q-form>
        </q-card-section>

        <!-- Step 2: Input OTP & New Password -->
        <q-card-section v-else-if="forgotStep === 2" class="q-pa-md">
          <!-- Simulated Notification Box -->
          <div class="bg-blue-1 text-blue-9 q-pa-md rounded-borders border-dashed q-mb-md text-caption">
            <div class="row items-center q-mb-xs">
              <q-icon name="info" size="18px" class="q-mr-xs" />
              <strong>Simulasi Pengiriman Email:</strong>
            </div>
            Kode OTP verifikasi Anda adalah <strong class="text-primary text-subtitle2">{{ simulatedForgotOtp }}</strong>.
            (Gunakan kode ini di bawah untuk memverifikasi kepemilikan email).
          </div>

          <q-form @submit="handleResetPassword">
            <q-input
              v-model="forgotOtp"
              label="Kode OTP (6 Digit)"
              outlined
              dense
              placeholder="123456"
              mask="######"
              :rules="[
                val => !!val || 'OTP wajib diisi',
                val => val.length === 6 || 'OTP harus 6 digit angka'
              ]"
              class="q-mb-sm"
            >
              <template v-slot:prepend>
                <q-icon name="pin" />
              </template>
            </q-input>

            <q-input
              v-model="newPassword"
              :type="showNewPassword ? 'text' : 'password'"
              label="Kata Sandi Baru"
              outlined
              dense
              :rules="[
                val => !!val || 'Kata sandi baru wajib diisi',
                val => val.length >= 6 || 'Kata sandi minimal 6 karakter'
              ]"
            >
              <template v-slot:prepend>
                <q-icon name="lock_open" />
              </template>
              <template v-slot:append>
                <q-icon
                  :name="showNewPassword ? 'visibility_off' : 'visibility'"
                  class="cursor-pointer"
                  @click="showNewPassword = !showNewPassword"
                />
              </template>
            </q-input>

            <div class="row justify-end q-gutter-x-sm q-mt-md">
              <q-btn flat label="Kembali" color="grey-7" no-caps @click="forgotStep = 1" />
              <q-btn type="submit" label="Ubah Kata Sandi" color="primary" no-caps :loading="forgotLoading" />
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
import { useAuthStore } from '../stores/authStore'
import { api } from '../boot/axios'
import RmsLogo from '../components/RmsLogo.vue'

const router = useRouter()
const $q = useQuasar()
const authStore = useAuthStore()

const identifier = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)

// Forgot password fields
const showForgotDialog = ref(false)
const forgotStep = ref(1) // 1: request, 2: verify/reset
const forgotEmail = ref('')
const forgotOtp = ref('')
const simulatedForgotOtp = ref('')
const newPassword = ref('')
const showNewPassword = ref(false)
const forgotLoading = ref(false)

async function handleLogin() {
  loading.value = true
  try {
    await authStore.login(identifier.value, password.value)
    $q.notify({
      type: 'positive',
      message: 'Login berhasil! Selamat datang di RMS Sembako.'
    })
    router.push('/')
  } catch (error) {
    const errorMsg = error.response?.data?.error || 'Email/Username atau kata sandi salah.'
    $q.notify({
      type: 'negative',
      message: errorMsg
    })
  } finally {
    loading.value = false
  }
}

function openForgotPasswordDialog() {
  forgotEmail.value = ''
  forgotOtp.value = ''
  simulatedForgotOtp.value = ''
  newPassword.value = ''
  forgotStep.value = 1
  showForgotDialog.value = true
}

async function handleRequestReset() {
  forgotLoading.value = true
  try {
    const res = await api.post('/api/auth/forgot-password', { email: forgotEmail.value })
    simulatedForgotOtp.value = res.data.otp // Fetch the simulated OTP code
    forgotStep.value = 2
    $q.notify({
      type: 'info',
      message: 'OTP berhasil dibuat. Masukkan kode untuk mereset sandi Anda.'
    })
  } catch (error) {
    const errorMsg = error.response?.data?.error || 'Gagal mengirim OTP.'
    $q.notify({
      type: 'negative',
      message: errorMsg
    })
  } finally {
    forgotLoading.value = false
  }
}

async function handleResetPassword() {
  forgotLoading.value = true
  try {
    await api.post('/api/auth/reset-password', {
      email: forgotEmail.value,
      otp: forgotOtp.value,
      newPassword: newPassword.value
    })
    $q.notify({
      type: 'positive',
      message: 'Kata sandi berhasil diperbarui. Silakan login kembali dengan sandi baru.'
    })
    showForgotDialog.value = false
  } catch (error) {
    const errorMsg = error.response?.data?.error || 'Gagal mereset kata sandi.'
    $q.notify({
      type: 'negative',
      message: errorMsg
    })
  } finally {
    forgotLoading.value = false
  }
}
</script>

<style lang="scss" scoped>
.bg-login-page {
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
