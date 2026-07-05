import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Build chiqishi va buzilgan/scratch fayllar lint qilinmaydi
  globalIgnores(['dist', 'dev-dist', 'scratch']),

  // ── Brauzer: React ilova (src/) ──
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      react.configs.flat.recommended,
      react.configs.flat['jsx-runtime'],
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      // Bu loyiha PropTypes ishlatmaydi — qoida faqat shovqin beradi
      'react/prop-types': 'off',
      // O'zbekcha matnlarda apostrof (o', g', ') odatiy — bu qoida bu loyiha uchun yaroqsiz
      'react/no-unescaped-entities': 'off',
      // Klassik `import React` loyiha bo'ylab ataylab ishlatiladi (Vite auto-runtime'da shart emas, zararsiz)
      // caughtErrors:'none' — ishlatilmagan `catch (e)` ga ruxsat (xato turini saqlash uchun)
      // ignoreRestSiblings — `const { x, ...rest } = obj` (xususiyatni chiqarib tashlash) idiomi uchun
      'no-unused-vars': ['error', { varsIgnorePattern: '^React$', argsIgnorePattern: '^_', caughtErrors: 'none', ignoreRestSiblings: true }],
      // HMR optimizatsiya maslahati — context+hook birga eksport qilinadi (ataylab), xato emas
      'react-refresh/only-export-components': 'warn',
    },
  },

  // ── Node (ESM): serverless API, ildizdagi *.js/*.mjs skriptlar, config fayllar ──
  {
    files: ['api/**/*.js', '*.{js,mjs}'],
    extends: [js.configs.recommended],
    languageOptions: {
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      // Bir martalik maintenance skriptlarida ishlatilmagan o'zgaruvchi xato emas — faqat ogohlantirish
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrors: 'none', ignoreRestSiblings: true }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },

  // ── Node (CommonJS): ildizdagi *.cjs maintenance/data skriptlari ──
  {
    files: ['**/*.cjs'],
    extends: [js.configs.recommended],
    languageOptions: {
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: {
      // Bir martalik maintenance skriptlarida ishlatilmagan o'zgaruvchi xato emas — faqat ogohlantirish
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrors: 'none', ignoreRestSiblings: true }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
])
