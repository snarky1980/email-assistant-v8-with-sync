/* eslint-disable no-unused-vars */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import VariablesPage from './VariablesPage.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// Check if this is the variables popout window
const params = new URLSearchParams(window.location.search)
const isVarsOnly = params.get('varsOnly') === '1'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      {isVarsOnly ? <VariablesPage /> : <App />}
    </ErrorBoundary>
  </StrictMode>
)
