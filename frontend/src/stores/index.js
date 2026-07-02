import { store } from 'quasar/wrappers'
import { createPinia } from 'pinia'

/*
 * When adding middleware to it or performing some board-wide configuration,
 * you can use this function to capture the pinia instance and export it.
 */
export default store((/* { ssrContext } */) => {
  const pinia = createPinia()

  // You can add Pinia plugins here if needed

  return pinia
})
