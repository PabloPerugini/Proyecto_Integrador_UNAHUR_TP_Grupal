import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import Footer from '../components/Footer';

export default function AdminLayout() {
  return (
    <div className="app-root">
      <AdminSidebar />
      <div className="app-main">
        <main className="app-content">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
