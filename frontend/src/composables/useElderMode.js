import { ref } from 'vue'

const largeTextMode = ref(localStorage.getItem('largeTextMode') === 'true')

export function useElderMode() {
  function toggleLargeTextMode() {
    largeTextMode.value = !largeTextMode.value
    localStorage.setItem('largeTextMode', largeTextMode.value.toString())
    applyLargeTextMode(largeTextMode.value)
  }

  function applyLargeTextMode(active) {
    if (active) {
      document.body.classList.add('elder-mode')
    } else {
      document.body.classList.remove('elder-mode')
    }
  }

  return {
    largeTextMode,
    toggleLargeTextMode,
    applyLargeTextMode
  }
}
