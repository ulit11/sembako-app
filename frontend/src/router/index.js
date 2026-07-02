import { defineRouter } from '#q-app'
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router'

import routes from './routes.js'
import { useAuthStore } from '../stores/authStore'

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter(({ store }) => {
  const createHistory = import.meta.env.QUASAR_SERVER
    ? createMemoryHistory
    : (import.meta.env.QUASAR_VUE_ROUTER_MODE === 'history' ? createWebHistory : createWebHashHistory)

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(import.meta.env.QUASAR_VUE_ROUTER_BASE)
  })

  // Navigation Guard for Authentication
  Router.beforeEach(async (to) => {
    const authStore = useAuthStore(store)

    // Restore user session if token exists but user info is null
    if (authStore.token && !authStore.user) {
      await authStore.fetchCurrentUser()
    }

    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
      return '/login'
    }
    if (to.meta.guestOnly && authStore.isAuthenticated) {
      return '/'
    }
    if (to.meta.requiresOwner && authStore.isAuthenticated && authStore.user?.role !== 'OWNER') {
      return '/pos'
    }
  })

  return Router
})
