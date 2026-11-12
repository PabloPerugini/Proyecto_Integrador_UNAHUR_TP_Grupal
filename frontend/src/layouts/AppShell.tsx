import { Outlet } from 'react-router-dom';
import AppSidebar from '../components/AppSidebar';
import Footer from '../components/Footer';
import AccountMenu from '../components/AccountMenu';

export default function AppShell() {
  return (
    <div className="app-root">
      <AppSidebar />
      <div className="app-main">
        <header className="app-topbar">
          <AccountMenu />
        </header>
        <main className="app-content">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
