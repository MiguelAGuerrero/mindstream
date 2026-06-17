import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import './style.css'
import App from './App.vue'
import router from './router/index.js'

const deepOcean = {
  dark: true,
  colors: {
    background: '#1a1f2e',
    surface: '#232a3b',
    'surface-bright': '#2c3548',
    'surface-light': '#2c3548',
    'surface-variant': '#384258',
    'on-surface-variant': '#c0c8d8',
    primary: '#5cbdaa',
    'primary-darken-1': '#4a9e8e',
    secondary: '#7e9bb5',
    'secondary-darken-1': '#6683a0',
    error: '#cf6679',
    info: '#6b9bd2',
    success: '#5cbdaa',
    warning: '#d4a76a',
    'on-background': '#e0e4ec',
    'on-surface': '#e0e4ec',
    'on-primary': '#1a1f2e',
    'on-secondary': '#1a1f2e',
  },
}

const vuetify = createVuetify({
  theme: {
    defaultTheme: 'deepOcean',
    themes: {
      deepOcean,
    },
  },
})

const app = createApp(App)
app.use(createPinia())
app.use(vuetify)
app.use(router)
app.mount('#app')
