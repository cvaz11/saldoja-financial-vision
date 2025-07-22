import { ReactNode } from 'react';
import { TowerSidebar } from './TowerSidebar';
import { TowerHeader } from './TowerHeader';

interface TowerLayoutProps {
  children: ReactNode;
}

export const TowerLayout = ({ children }: TowerLayoutProps) => {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <TowerSidebar />
      <div className="flex-1 flex flex-col">
        <TowerHeader />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};