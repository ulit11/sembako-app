<template>
  <q-layout>
    <q-page-container>
      <q-page class="flex flex-center bg-login-page q-pa-md">
        <div class="full-width max-auth-width">
      <!-- App Logo / Title Header -->
      <div class="text-center q-mb-xl">
        <q-avatar size="72px" class="bg-primary text-white shadow-3 q-mb-md">
          <q-icon name="storefront" size="48px" />
        </q-avatar>
        <h1 class="text-h4 text-weight-bold text-grey-9 dark-text q-ma-none">SembakoApp</h1>
        <p class="text-subtitle1 text-grey-6 dark-grey-text q-mt-xs q-mb-none">Sistem Stok Toko Sembako</p>
      </div>

      <!-- Login Card -->
      <q-card class="auth-card shadow-12 q-pa-lg">
        <q-card-section class="q-pa-none q-mb-lg">
          <h2 class="text-h5 text-weight-bold text-grey-9 dark-text q-ma-none">Masuk</h2>
          <p class="text-caption text-grey-6 dark-grey-text q-mt-xs q-mb-none">Silakan masuk ke akun Anda</p>
        </q-card-section>

        <!-- Form fields -->
        <q-card-section class="q-pa-none">
          <q-form @submit="handleLogin" class="q-gutter-y-md">
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

            <!-- Submit Button -->
            <div class="q-mt-xl">
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
      </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '../stores/authStore'

const router = useRouter()
const $q = useQuasar()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)

async function handleLogin() {
  loading.value = true
  try {
    await authStore.login(email.value, password.value)
    $q.notify({
      type: 'positive',
      message: 'Login berhasil! Selamat datang kembali.'
    })
    router.push('/')
  } catch (error) {
    const errorMsg = error.response?.data?.error || 'Email atau kata sandi salah.'
    $q.notify({
      type: 'negative',
      message: errorMsg
    })
  } finally {
    loading.value = false
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
</style>
