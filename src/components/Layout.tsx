import React from 'react';
import Navbar from './Navbar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>
      {/* Potential Footer could go here */}
      {/* <footer className="bg-card border-t border-border p-4 text-center text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} QR Takip. Tüm hakları saklıdır.</p>
      </footer> */}
    </div>
  );
};

export default Layout; 