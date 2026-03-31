import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// 🔥 FORÇA CARREGAMENTO DO CSS
import './index.css'
import './App.css' // 👈 só funciona se existir, se não existir pode apagar essa linha

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)