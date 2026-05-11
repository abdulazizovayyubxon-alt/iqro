import React from 'react'
import ReactDOM from 'react-dom/client'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ObjectionProvider } from './context/ObjectionContext'
import { AppProvider } from './context/AppContext'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <ObjectionProvider>
          <AppProvider>
            <App />
          </AppProvider>
        </ObjectionProvider>
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>,
)
