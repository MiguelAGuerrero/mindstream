<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  suggestions: { type: Array, default: () => [] },
});

const problem = ref('');
const isDropdownOpen = ref(false);
const highlightedIndex = ref(-1);

const emit = defineEmits(['submit']);

const filteredSuggestions = computed(() => {
  const q = problem.value.trim().toLowerCase();
  if (!q) return [];
  return props.suggestions.filter((t) =>
    t.toLowerCase().includes(q)
  );
});

const showDropdown = computed(
  () =>
    isDropdownOpen.value &&
    filteredSuggestions.value.length > 0
);

function handleSubmit(e) {
  e?.preventDefault();
  const value =
    showDropdown.value &&
    highlightedIndex.value >= 0 &&
    filteredSuggestions.value[highlightedIndex.value]
      ? filteredSuggestions.value[highlightedIndex.value]
      : problem.value.trim();
  if (value) emit('submit', value);
}

function handleKeydown(e) {
  if (e.key === 'Enter') {
    handleSubmit(e);
    return;
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (showDropdown.value) {
      highlightedIndex.value = Math.min(
        highlightedIndex.value + 1,
        filteredSuggestions.value.length - 1
      );
    }
    return;
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (showDropdown.value) {
      highlightedIndex.value = Math.max(
        highlightedIndex.value - 1,
        0
      );
    }
    return;
  }
  highlightedIndex.value = -1;
}

function selectSuggestion(title) {
  problem.value = title;
  isDropdownOpen.value = false;
  highlightedIndex.value = -1;
  emit('submit', title);
}

function onFocus() {
  isDropdownOpen.value = true;
}

function onBlur() {
  setTimeout(() => {
    isDropdownOpen.value = false;
    highlightedIndex.value = -1;
  }, 150);
}
</script>

<template>
  <div class="home">
    <h1 class="prompt">What problem are you trying to solve?</h1>
    <form @submit="handleSubmit" class="search-form">
      <div class="autocomplete-wrap">
        <input
          v-model="problem"
          type="text"
          class="search-input"
          placeholder="I want to..."
          autofocus
          @keydown="handleKeydown"
          @focus="onFocus"
          @blur="onBlur"
        />
        <ul
          v-if="showDropdown"
          class="suggestions-list"
          role="listbox"
        >
          <li
            v-for="(title, i) in filteredSuggestions"
            :key="title"
            role="option"
            :aria-selected="i === highlightedIndex"
            :class="{ highlighted: i === highlightedIndex }"
            @mousedown.prevent="selectSuggestion(title)"
          >
            {{ title }}
          </li>
        </ul>
      </div>
    </form>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  min-height: 240px;
}

.prompt {
  font-size: 1.75rem;
  font-weight: 500;
  margin: 0;
  color: var(--color-text-primary);
}

.search-form {
  width: 100%;
}

.autocomplete-wrap {
  position: relative;
  width: 100%;
}

.suggestions-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin: 0.25rem 0 0;
  padding: 0;
  list-style: none;
  background-color: rgba(30, 30, 30, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 1rem;
  max-height: 12rem;
  overflow-y: auto;
  z-index: 10;
}

.suggestions-list li {
  padding: 0.75rem 1.25rem;
  color: var(--color-text-primary);
  cursor: pointer;
}

.suggestions-list li:hover,
.suggestions-list li.highlighted {
  background-color: rgba(255, 255, 255, 0.08);
}

.search-input {
  width: 100%;
  padding: 1rem 1.25rem;
  font-size: 1.125rem;
  font-family: inherit;
  color: var(--color-text-primary);
  background-color: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 2rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.search-input::placeholder {
  color: var(--color-text-secondary);
}

.search-input:hover {
  border-color: rgba(255, 255, 255, 0.25);
}

.search-input:focus {
  border-color: rgba(100, 108, 255, 0.6);
  box-shadow: 0 0 0 3px rgba(100, 108, 255, 0.2);
}
</style>
