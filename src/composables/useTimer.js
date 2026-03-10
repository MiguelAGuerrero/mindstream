import { ref } from 'vue'
import { useIntervalFn } from '@vueuse/core'

/**
 * Timer composable using VueUse's useIntervalFn.
 * @param {number} [intervalMs=1000] - Interval in milliseconds (default 1 second)
 * @returns {{ pause: () => void, resume: () => void, reset: () => void, value: import('vue').Ref<number>, isActive: import('vue').ShallowRef<boolean> }}
 */
export function useTimer(intervalMs = 1000) {
  const value = ref(0)

  const { pause, resume, isActive } = useIntervalFn(
    () => {
      value.value++
    },
    intervalMs,
    { immediate: false }
  )

  function reset() {
    pause()
    value.value = 0
  }

  return {
    pause,
    resume,
    reset,
    value,
    isActive,
  }
}
