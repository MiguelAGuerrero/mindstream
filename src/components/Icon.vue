<script setup>
import { computed } from 'vue';
const props = defineProps({
  name: {
    type: String,
    required: true
  },
  size: {
    type: [Number, String],
    default: 24
  },
  color: {
    type: String,
    default: "white"
  },
  variant: {
    type: String,
    default: "solid",
    validator: (value) => {
        return ['solid', 'regular', 'light', 'thin', 'duotone'].includes(value);
    }
  },
});

const fontName = computed(() => {
    if (props.name.startsWith('fa-')) {
        return props.name.toLowerCase();
    }
    return `fa-${props.name.toLowerCase()}`;
});

const iconClass = computed(() => {
  return `${fontName.value} fa-${props.variant}`;
});

</script>

<template>
  <i :class="iconClass" :style="{ fontSize: size, color: color }"></i>
</template>