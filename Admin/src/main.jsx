import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// 🔥 Toaster Import
import { Toaster } from 'react-hot-toast'
import { SidebarProvider } from './component/SidebarContext.jsx'

// ✅ GLOBAL SCROLL FIX: Number inputs par mouse wheel se value change hona band
document.addEventListener("wheel", (event) => {
  // Check karta hai ki kya focus kisi number input par hai
  if (document.activeElement && document.activeElement.type === "number") {
    document.activeElement.blur(); 
  }
}, { passive: false });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Toaster position="top-center" />
    <SidebarProvider>
      <App />
    </SidebarProvider>
  </StrictMode>,
)