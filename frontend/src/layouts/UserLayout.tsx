import { Outlet } from 'react-router-dom';
import UserSidebar from '../components/UserSidebar';
import Footer from '../components/Footer';

export default function UserLayout() {
  return (
    <div className="app-root">
      <UserSidebar />
      <div className="app-main">
        <main className="app-content">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
