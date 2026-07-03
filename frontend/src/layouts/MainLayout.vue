<template>
  <q-layout view="lHh Lpr lFf" class="mobile-layout shadow-10">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar class="q-py-sm">
        <q-avatar size="36px" class="q-mr-sm bg-white text-primary">
          <q-icon name="storefront" size="24px" />
        </q-avatar>

        <q-toolbar-title class="text-weight-bold">
          SembakoApp
          <span class="text-subtitle2 block text-weight-regular text-grey-3">Stok Toko Sembako</span>
        </q-toolbar-title>

        <q-btn
          flat
          round
          dense
          :icon="$q.dark.isActive ? 'light_mode' : 'dark_mode'"
          class="q-mr-xs"
          @click="toggleDarkMode"
        />

        <q-btn
          flat
          round
          dense
          icon="logout"
          @click="handleLogout"
        />
      </q-toolbar>
    </q-header>

    <q-page-container class="bg-page">
      <router-view v-slot="{ Component }">
        <transition enter-active-class="animated fadeIn" leave-active-class="animated fadeOut" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </q-page-container>

    <q-footer borderless class="bg-surface text-primary footer-shadow">
      <q-tabs
        v-model="activeTab"
        indicator-color="primary"
        active-color="primary"
        class="text-grey-7"
        no-caps
        align="justify"
      >
        <q-route-tab
          name="dashboard"
          to="/"
          exact
          icon="space_dashboard"
          label="Home"
        />
        <q-route-tab
          name="products"
          to="/products"
          exact
          icon="inventory_2"
          label="Stok"
        />
        <q-route-tab
          name="pos"
          to="/pos"
          exact
          icon="point_of_sale"
          label="Kasir"
        />
        <q-route-tab
          v-if="authStore.user?.role === 'OWNER'"
          name="reports"
          to="/reports"
          exact
          icon="assessment"
          label="Laporan"
        />
        <q-route-tab
          v-if="authStore.user?.role === 'OWNER'"
          name="settings"
          to="/settings"
          exact
          icon="settings"
          label="Pengaturan"
        />
      </q-tabs>
    </q-footer>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const $q = useQuasar()
const router = useRouter()
const authStore = useAuthStore()

const activeTab = ref('dashboard')

// Initialize Dark Mode based on preference or local storage
if (localStorage.getItem('darkMode') === 'true') {
  $q.dark.set(true)
} else {
  $q.dark.set(false)
}

function toggleDarkMode() {
  const nextVal = !$q.dark.isActive
  $q.dark.set(nextVal)
  localStorage.setItem('darkMode', nextVal)
}

function handleLogout() {
  authStore.logout()
  $q.notify({
    type: 'info',
    message: 'Anda telah keluar dari aplikasi.'
  })
  router.push('/login')
}
</script>

<style lang="scss">
// Mobile Centering Layout
.mobile-layout {
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  border-left: 1px solid rgba(0, 0, 0, 0.05);
  border-right: 1px solid rgba(0, 0, 0, 0.05);
  background: var(--q-bg-page);
  position: relative;
}

body {
  background-color: #f0f2f5;
  transition: background-color 0.3s ease;
}

body.body--dark {
  background-color: #121212 !important;
}

.bg-page {
  background-color: #f8f9fa;
  .body--dark & {
    background-color: #121212;
  }
}

.bg-surface {
  background-color: #ffffff;
  .body--dark & {
    background-color: #1d1d1d;
  }
}

.footer-shadow {
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
  .body--dark & {
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.3);
  }
}
</style>
