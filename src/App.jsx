//src/App.jsx

import { Outlet } from 'react-router-dom';
import { Header } from './components/Header.jsx'
import { Footer } from './components/Footer.jsx'

export default function App() {
  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Header />
      <main className="relative z-0 flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
