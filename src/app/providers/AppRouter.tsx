import { useEffect, useState } from 'react';
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';

import { useWalletStore } from '@/entities/wallet';
import { HomePage } from '@/pages/home';
import { OnboardingPage } from '@/pages/onboarding';
import { ReceivePage } from '@/pages/receive';
import { SendPage } from '@/pages/send';
import { APP_TITLE } from '@/shared/config/constants';
import { shortenAddress } from '@/shared/lib/format';
import { Button } from '@/shared/ui';

import { WalletRealtimeProvider } from './WalletRealtimeProvider';

const ProtectedRoute = ({ children }: { children: JSX.Element }): JSX.Element => {
  const wallet = useWalletStore((state) => state.wallet);
  const wallets = useWalletStore((state) => state.wallets);
  const switchActiveWallet = useWalletStore((state) => state.switchActiveWallet);

  useEffect(() => {
    if (!wallet && wallets.length > 0) {
      void switchActiveWallet(wallets[0].id);
    }
  }, [wallet, wallets, switchActiveWallet]);

  if (!wallet && wallets.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  if (!wallet && wallets.length > 0) {
    return <div className="page-center muted-text">Switching wallet...</div>;
  }

  return children;
};

const RootRedirect = (): JSX.Element => {
  const wallets = useWalletStore((state) => state.wallets);

  return <Navigate to={wallets.length > 0 ? '/home' : '/onboarding'} replace />;
};

const AppLayout = ({ children }: { children: JSX.Element }): JSX.Element => {
  const navigate = useNavigate();
  const wallet = useWalletStore((state) => state.wallet);
  const wallets = useWalletStore((state) => state.wallets);
  const switchActiveWallet = useWalletStore((state) => state.switchActiveWallet);
  const clearWallet = useWalletStore((state) => state.clearWallet);
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = (): void => {
    setIsResetting(true);
    clearWallet();
    navigate('/onboarding');
    setIsResetting(false);
  };

  const handleSwitchWallet = async (nextWalletId: string): Promise<void> => {
    await switchActiveWallet(nextWalletId);
    navigate('/home');
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-left">
          <Link to={wallet ? '/home' : '/onboarding'} className="brand-link">
            {APP_TITLE}
          </Link>
          <span className="network-pill">testnet</span>
        </div>

        {wallet ? (
          <nav className="topbar-nav" aria-label="Main navigation">
            <label className="wallet-switch-label" htmlFor="wallet-switch-select">
              Wallet
            </label>
            <select
              id="wallet-switch-select"
              className="wallet-switch"
              value={wallet.id}
              onChange={(event) => {
                void handleSwitchWallet(event.target.value);
              }}
            >
              {wallets.map((item) => (
                <option key={item.id} value={item.id}>
                  {shortenAddress(item.addressFriendly, 7, 7)}
                </option>
              ))}
            </select>
            <Button variant="secondary" onClick={() => navigate('/onboarding')}>
              Add wallet
            </Button>
            <NavLink
              to="/home"
              className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')}
            >
              Home
            </NavLink>
            <NavLink
              to="/send"
              className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')}
            >
              Send
            </NavLink>
            <NavLink
              to="/receive"
              className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')}
            >
              Receive
            </NavLink>
            <Button variant="danger" onClick={handleReset} disabled={isResetting}>
              Reset all
            </Button>
          </nav>
        ) : null}
      </header>
      <main className="main-content">{children}</main>
    </div>
  );
};

const RoutedApp = (): JSX.Element => {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/send"
        element={
          <ProtectedRoute>
            <SendPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/receive"
        element={
          <ProtectedRoute>
            <ReceivePage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export const AppRouter = (): JSX.Element => {
  return (
    <BrowserRouter>
      <AppLayout>
        <>
          <WalletRealtimeProvider />
          <RoutedApp />
        </>
      </AppLayout>
    </BrowserRouter>
  );
};
