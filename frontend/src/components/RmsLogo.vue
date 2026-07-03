<template>
  <div class="rms-logo-container flex flex-center" :style="{ width: size, height: size }">
    <svg viewBox="0 0 100 100" class="full-width full-height">
      <!-- Background Circle with Harmonic Gradient (modern deep blue to purple-blue) -->
      <defs>
        <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e3c72" />
          <stop offset="100%" stop-color="#2a5298" />
        </linearGradient>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" flood-opacity="0.2" />
        </filter>
      </defs>
      
      <!-- Base Emblem Circle -->
      <circle cx="50" cy="50" r="46" fill="url(#logo-grad)" filter="url(#shadow)" />
      
      <!-- Outer elegant glowing ring -->
      <circle cx="50" cy="50" r="41" fill="none" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1.5" />
      
      <!-- Styled Modern Shopping Bag/Basket -->
      <path 
        d="M32 42 H68 L64 74 Q50 78 36 74 Z" 
        fill="#ffffff" 
      />
      
      <!-- Bag Handle (curved arch) -->
      <path 
        d="M40 42 Q50 20 60 42" 
        fill="none" 
        stroke="#ffffff" 
        stroke-width="5.5" 
        stroke-linecap="round"
      />
      
      <!-- Golden Sembako Leaf emblem inside the basket representing freshness/growth -->
      <path 
        d="M50 49 Q44 57 50 65 Q56 57 50 49" 
        fill="#FFD700" 
      />
      
      <!-- RMS text centered on the basket -->
      <text 
        x="50" 
        y="58" 
        font-family="'Outfit', 'Inter', 'Roboto', sans-serif" 
        font-weight="900" 
        font-size="11" 
        fill="#1e3c72" 
        text-anchor="middle"
        letter-spacing="0.5"
      >RMS</text>
    </svg>
  </div>
</template>

<script setup>
defineProps({
  size: {
    type: String,
    default: '48px'
  }
})
</script>

<style scoped>
.rms-logo-container {
  display: inline-block;
  user-select: none;
}
</style>
