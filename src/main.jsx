import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
// Yazı tipi uygulamanın içinde: internet olmasa da logo ve yazılar aynı görünür
import './fonts.css';
import { haptic } from './services/native';

// HIG: geri alınamayacak işlemden önce uyarı titreşimi (iOS'ta confirm() Apple'ın kendi uyarı penceresidir)
const nativeConfirm = window.confirm.bind(window);
window.confirm = (msg) => { haptic.warning(); return nativeConfirm(msg); };

// Klavye erişimi: role="button" olan div/span'lar Enter ve Boşluk ile tıklanır.
// Kendi tuş işleyicisi olan bileşenler (preventDefault yapanlar) iki kez tetiklenmez.
document.addEventListener("keydown", (e) => {
  if (e.defaultPrevented || (e.key !== "Enter" && e.key !== " ")) return;
  const el = e.target;
  if (el instanceof HTMLElement && el.getAttribute("role") === "button" && el.tagName !== "BUTTON") {
    e.preventDefault();
    el.click();
  }
});

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React ErrorBoundary caught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#0A0A0B',
          color: '#EDE8DF',
          padding: 24,
          fontFamily: 'sans-serif',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#E05A5A', marginBottom: 12 }}>⚠️ Bir Hata Oluştu</h2>
          <p style={{ color: '#999084', maxWidth: 400, fontSize: 13, marginBottom: 20 }}>
            {this.state.error?.toString()}
          </p>
          <button
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{
              background: '#B8953F',
              color: '#0A0A0B',
              border: 'none',
              borderRadius: 12,
              padding: '12px 24px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Önbelleği Temizle ve Yeniden Başlat
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
