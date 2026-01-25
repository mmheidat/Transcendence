import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import GameModes from './pages/GameModes';
import Game from './pages/Game';
import Login from './pages/Login';
import Register from './pages/Register';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import Chat from './pages/Chat';
import AIAssistant from './pages/AIAssistant';
import SettingsPage from './pages/Settings';
import Tournament from './pages/Tournament';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import MeetTheDevs from './pages/MeetTheDevs';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';


// Route Guard
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen text-white">Loading...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/meet-the-devs" element={<MeetTheDevs />} />

            <Route path="/*" element={
                <ProtectedRoute>
                    <Layout>
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/play" element={<GameModes />} />
                            <Route path="/game" element={<Game />} />
                            <Route path="/leaderboard" element={<Leaderboard />} />
                            <Route path="/profile" element={<Profile />} />
                            <Route path="/chat" element={<Chat />} />
                            <Route path="/ai" element={<AIAssistant />} />
                            <Route path="/settings" element={<SettingsPage />} />
                            <Route path="/tournament" element={<Tournament />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </Layout>
                </ProtectedRoute>
            } />
        </Routes>
    );
}

function App() {
    return (
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <div className="cyber-bg min-h-screen text-white font-sans">
                <div className="cyber-grid-floor"></div>
                <AuthProvider>
                    <NotificationProvider>
                        <AppRoutes />
                    </NotificationProvider>
                </AuthProvider>
            </div>
        </Router>
    )
}

export default App;
