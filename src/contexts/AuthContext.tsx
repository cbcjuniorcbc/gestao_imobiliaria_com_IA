import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types';
import { mockUsers } from '@/lib/mockData';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Função para detectar se está rodando no Electron
const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI !== undefined;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Verificar se há usuário salvo no localStorage
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    if (isElectron()) {
      // Usar Electron IPC quando disponível
      const result = await window.electronAPI!.login({ username, password });
      if (result.success && result.user) {
        setUser(result.user);
        localStorage.setItem('currentUser', JSON.stringify(result.user));
        return true;
      }
      return false;
    } else {
      // Fallback para mock (desenvolvimento web)
      const validCredentials = [
        { username: 'admin', password: 'admin123' },
        { username: 'recep', password: 'recep123' }
      ];

      const isValid = validCredentials.some(
        cred => cred.username === username && cred.password === password
      );

      if (isValid) {
        const foundUser = mockUsers.find(u => u.username === username);
        if (foundUser) {
          setUser(foundUser);
          localStorage.setItem('currentUser', JSON.stringify(foundUser));
          return true;
        }
      }

      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
