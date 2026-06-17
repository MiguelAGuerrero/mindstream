<script setup>
// Empty-state composer: you AUTHOR what you're focusing on. This replaces the
// old upfront workflow picker — the prompt is the thing you're working on,
// typed by you, not prescribed by a template.
import { ref } from "vue";

const emit = defineEmits(["submit"]);
const text = ref("");

function submit() {
  const t = text.value.trim();
  if (!t) return;
  emit("submit", t);
  text.value = "";
}
</script>

<template>
  <div class="focus-composer">
    <p class="focus-composer__eyebrow">FOCUS</p>
    <h2 class="focus-composer__prompt">What are you working on?</h2>
    <v-textarea
      v-model="text"
      class="focus-composer__input"
      variant="outlined"
      rows="2"
      auto-grow
      autofocus
      hide-details
      placeholder="Write the one thing you want to focus on…"
      @keydown.enter.exact.prevent="submit"
    />
    <v-btn
      color="primary"
      size="large"
      variant="flat"
      class="focus-composer__go"
      :disabled="!text.trim()"
      @click="submit"
    >
      Start focus
    </v-btn>
  </div>
</template>

<style scoped>
.focus-composer {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 520px;
  margin: auto;
  padding: 24px;
  text-align: center;
}

.focus-composer__eyebrow {
  font-size: 0.75rem;
  letter-spacing: 0.18em;
  font-weight: 700;
  margin: 0 0 0.5rem;
  color: rgba(var(--v-theme-on-surface), 0.45);
}

.focus-composer__prompt {
  font-size: clamp(1.5rem, 4vw, 2.25rem);
  font-weight: 600;
  line-height: 1.25;
  margin: 0 0 1.5rem;
  color: rgb(var(--v-theme-on-surface));
}

.focus-composer__input {
  width: 100%;
  margin-bottom: 1.25rem;
  text-align: left;
}

.focus-composer__go {
  align-self: stretch;
}
</style>
