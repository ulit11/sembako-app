const routes = [
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', component: () => import('@/pages/IndexPage.vue') },
      { path: 'products', component: () => import('@/pages/ProductsPage.vue') },
      { path: 'pos', component: () => import('@/pages/PosPage.vue') },
      { path: 'reports', component: () => import('@/pages/ReportsPage.vue'), meta: { requiresOwner: true } },
      { path: 'settings', component: () => import('@/pages/SettingsPage.vue'), meta: { requiresOwner: true } }
    ],
  },
  {
    path: '/login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { guestOnly: true }
  },
  {
    path: '/register',
    component: () => import('@/pages/RegisterPage.vue'),
    meta: { guestOnly: true }
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('@/pages/ErrorNotFound.vue'),
  }
]

export default routes
