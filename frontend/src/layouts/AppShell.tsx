import { Outlet } from 'react-router-dom';
import AppSidebar from '../components/AppSidebar';
import Footer from '../components/Footer';

export default function AppShell() {
  return (
    <div className="app-root">
      <AppSidebar />
      <div className="app-main">
        <main className="app-content">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
