import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Wifi, 
  WifiOff, 
  Bell, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  FileText,
  RefreshCw,
  X
} from 'lucide-react';

type ConnectionStatus = 'Connected' | 'Disconnected' | 'Reconnecting';

interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface SocketContextType {
  status: ConnectionStatus;
  toasts: Toast[];
  removeToast: (id: string) => void;
  socket: any;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<ConnectionStatus>('Disconnected');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [socketInstance, setSocketInstance] = useState<any>(null);
  const queryClient = useQueryClient();

  const addToast = (title: string, message: string, type: Toast['type'] = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, title, message, type }]);
    
    // Auto-remove toast after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) {
      setStatus('Disconnected');
      return;
    }

    let userId = 'anonymous';
    try {
      userId = JSON.parse(userStr).id;
    } catch (e) {
      console.warn('Failed to parse user session info.');
    }

    // Connect to backend Socket.IO server
    const socketUrl = 'http://localhost:5000';
    const socket = io(socketUrl, {
      query: { userId },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });
    setSocketInstance(socket);

    socket.on('connect', () => {
      setStatus('Connected');
    });

    socket.on('disconnect', () => {
      setStatus('Disconnected');
    });

    socket.on('reconnect_attempt', () => {
      setStatus('Reconnecting');
    });

    socket.on('connect_error', () => {
      setStatus('Disconnected');
    });

    // Event 1: payment.received
    socket.on('payment.received', (data: any) => {
      const count = data.count || 1;
      const amountStr = data.amount ? `₹${Number(data.amount).toLocaleString('en-IN')}` : 'Captured';
      addToast(
        'Payment Received',
        `Processed ${count} payment transaction(s) worth ${amountStr}.`,
        'success'
      );
      // Invalidate queries to reload dashboard UI live
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['cash-summary'] });
      queryClient.invalidateQueries({ queryKey: ['cash-forecast'] });
      queryClient.invalidateQueries({ queryKey: ['control-score'] });
    });

    // Event 2: record.imported
    socket.on('record.imported', (data: any) => {
      addToast(
        'Import Succeeded',
        `File ${data.fileName} with ${data.totalRecords} raw rows successfully uploaded.`,
        'success'
      );
      queryClient.invalidateQueries({ queryKey: ['imports'] });
    });

    // Event 3: reconciliation.started
    socket.on('reconciliation.started', () => {
      addToast(
        'Reconciliation Started',
        'Ledger matching algorithms initiated.',
        'info'
      );
      queryClient.invalidateQueries({ queryKey: ['reconciliation-runs'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation-summary'] });
    });

    // Event 4: reconciliation.completed
    socket.on('reconciliation.completed', (data: any) => {
      addToast(
        'Reconciliation Completed',
        `Run finished. Match rate at ${data.matchRate}%. Found ${data.exceptionsFound} exceptions.`,
        'success'
      );
      queryClient.invalidateQueries({ queryKey: ['reconciliation-runs'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation-summary'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation-records'] });
      queryClient.invalidateQueries({ queryKey: ['exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['control-score'] });
    });

    // Event 5: exception.created
    socket.on('exception.created', (data: any) => {
      addToast(
        'New Exception Logged',
        `${data.count} discrepancy exceptions require operator review.`,
        'warning'
      );
      queryClient.invalidateQueries({ queryKey: ['exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation-summary'] });
    });

    // Event 6: exception.updated
    socket.on('exception.updated', (data: any) => {
      addToast(
        'Exception Resolved',
        `Status set to ${data.status} for Exception ID: ${data.id.slice(0, 8)}...`,
        'success'
      );
      queryClient.invalidateQueries({ queryKey: ['exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['control-score'] });
    });

    // Event 7: cash.updated
    socket.on('cash.updated', () => {
      queryClient.invalidateQueries({ queryKey: ['cash-summary'] });
      queryClient.invalidateQueries({ queryKey: ['cash-forecast'] });
      queryClient.invalidateQueries({ queryKey: ['control-score'] });
    });

    return () => {
      socket.disconnect();
      setSocketInstance(null);
    };
  }, [queryClient]);

  return (
    <SocketContext.Provider value={{ status, toasts, removeToast, socket: socketInstance }}>
      {children}

      {/* Floating Subtle Toasts notification stack */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((toast) => {
          let icon = <Bell className="w-4 h-4 text-blue-500" />;
          let bgClass = 'bg-white border-blue-100';
          if (toast.type === 'success') {
            icon = <CheckCircle className="w-4 h-4 text-emerald-500" />;
            bgClass = 'bg-white border-emerald-100';
          } else if (toast.type === 'warning') {
            icon = <AlertTriangle className="w-4 h-4 text-amber-500" />;
            bgClass = 'bg-white border-amber-100';
          } else if (toast.type === 'error') {
            icon = <AlertTriangle className="w-4 h-4 text-rose-500" />;
            bgClass = 'bg-white border-rose-100';
          }

          return (
            <div 
              key={toast.id}
              className={`p-3.5 border rounded-2xl shadow-lg flex gap-3 items-start justify-between text-left animate-in slide-in-from-bottom-5 fade-in duration-200 ${bgClass}`}
            >
              <div className="flex gap-2.5 items-start">
                <div className="mt-0.5">{icon}</div>
                <div className="space-y-0.5">
                  <span className="text-[11px] font-extrabold text-[#0B1726]">{toast.title}</span>
                  <p className="text-[10px] text-gray-500 font-semibold leading-normal">{toast.message}</p>
                </div>
              </div>
              <button 
                onClick={() => removeToast(toast.id)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </SocketContext.Provider>
  );
};
