import Layout from "./Layout.jsx";

import Map from "./Map";

import Volunteers from "./Volunteers";

import Supplies from "./Supplies";

import Admin from "./Admin";

import AdminLayout from "./Admin/Layout";
import AdminDashboard from "./Admin/index";
import AdminUserManagement from "./Admin/UserManagement";
import AdminVictimVerification from "./Admin/VictimVerification";
import AdminAuditLogs from "./Admin/AuditLogs";

import About from "./About";

import GridMonitor from "./GridMonitor";

import RequestHelp from "./RequestHelp";

import Login from "./Login";

import Register from "./Register";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {

    Map: Map,

    Volunteers: Volunteers,

    Supplies: Supplies,

    Admin: Admin,

    About: About,

    GridMonitor: GridMonitor,

    RequestHelp: RequestHelp,

    Login: Login,

    Register: Register,

}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);

    // Login and Register pages should not have Layout wrapper
    const isAuthPage = location.pathname === '/Login' || location.pathname === '/login' ||
                       location.pathname === '/Register' || location.pathname === '/register';

    // Admin pages use their own AdminLayout
    const isAdminPage = location.pathname.startsWith('/admin');

    if (isAuthPage) {
        return (
            <Routes>
                <Route path="/Login" element={<Login />} />
                <Route path="/login" element={<Login />} />
                <Route path="/Register" element={<Register />} />
                <Route path="/register" element={<Register />} />
            </Routes>
        );
    }

    if (isAdminPage) {
        return (
            <Routes>
                <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="users" element={<AdminUserManagement />} />
                    <Route path="victims" element={<AdminVictimVerification />} />
                    <Route path="audit" element={<AdminAuditLogs />} />
                </Route>
            </Routes>
        );
    }

    return (
        <Layout currentPageName={currentPage}>
            <Routes>

                    <Route path="/" element={<Map />} />


                <Route path="/Map" element={<Map />} />

                <Route path="/Volunteers" element={<Volunteers />} />

                <Route path="/Supplies" element={<Supplies />} />

                <Route path="/Admin" element={<Admin />} />

                <Route path="/About" element={<About />} />

                <Route path="/GridMonitor" element={<GridMonitor />} />

                <Route path="/RequestHelp" element={<RequestHelp />} />

            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}