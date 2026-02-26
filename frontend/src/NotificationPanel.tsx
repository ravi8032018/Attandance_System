// app/_components/NotificationCenter.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from './api_fetch';

type NotificationMessage = {
  id?: string;
  type: string;
  title?: string;
  body?: string;
  data?: any;
  timestamp?: string;
};

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000';

export function NotificationCenter() {
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const socket = new WebSocket(`${WS_BASE_URL}/ws/notify`);

    socket.addEventListener('open', () => {
      setConnected(true);
      setError(null);
    });

    socket.addEventListener('message', (event) => {
      try {
        const data: NotificationMessage = JSON.parse(event.data);

        setNotifications((prev) => [data, ...prev]);

        // Optional toast popup
        if (Notification && Notification.permission === 'granted') {
          new Notification(data.title ?? 'New notification', {
            body: data.body,
          });
        }
      } catch (e) {
        console.error('Invalid WS message', e, event.data);
      }
    });

    socket.addEventListener('close', () => {
      setConnected(false);
    });

    socket.addEventListener('error', (event) => {
      // console.error('WebSocket error', event);
      setError('Notification service not available');
    });

    return () => {
      socket.close();
    };
  }, []);

  // laod missed notifications from DB
  useEffect(() => {
    async function loadFromDb() {
      try {
        const api = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';
        const res = await fetch(`${api}/notifications`, {
          method: 'GET',
          credentials: 'include',
        });
        const data = await res.json().catch(() => []);
        if (res.ok && Array.isArray(data)) {
          setNotifications(data);
        }
      } catch (e) {
        console.error('Failed to load notifications from DB', e);
      }
    }
    loadFromDb();
  }, []);

  function handleNotificationClick(n: NotificationMessage) {
    if (n.type === 'cr_attendance_session_started') {
      const token = n?.data?.attendance_token || n?.data?.token;
      if (!token) return;
      router.push(`/student/cr/${encodeURIComponent(token)}/take-attendance`);
      setShowDropdown(false);
      return;
    }
    // other types...
  }

  return (
    <div className="">
      {/* Bell icon with badge */}
      <button
        type="button"
        onClick={() => (setShowDropdown((v) => !v))}
        className="relative inline-flex items-center justify-center p-2 rounded-full hover:bg-slate-100"
        aria-label="Notifications"
      >
        {/* notifications */}
        <div className='flex items-center relative'>
          <span className="material-icons text-slate-700">
            <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="25" height="25" viewBox="0 0 50 50">
              <path d="M 25 1 A 4 4 0 0 0 25 9 A 4 4 0 0 0 25 1 z M 19.400391 7.0996094 C 14.800391 8.9996094 12 13.4 12 19 C 12 29.4 9.2 31.9 7.5 33.5 C 6.7 34.2 6 34.9 6 36 C 6 40 12.2 42 25 42 C 37.8 42 44 40 44 36 C 44 34.9 43.3 34.2 42.5 33.5 C 40.8 31.9 38 29.4 38 19 C 38 13.3 35.299609 8.9996094 30.599609 7.0996094 C 29.799609 9.3996094 27.6 11 25 11 C 22.4 11 20.200391 9.3996094 19.400391 7.0996094 z M 19.099609 43.800781 C 19.499609 46.800781 22 49 25 49 C 28 49 30.500391 46.800781 30.900391 43.800781 C 29.000391 44.000781 27 44 25 44 C 23 44 20.999609 44.000781 19.099609 43.800781 z"></path>
            </svg>
          </span>
          {notifications.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] text-white">
              {notifications.length}
            </span>
          )}
        </div>
        
        <span
            className={`flex ml-1 h-2 w-2 mb-1 rounded-full ${connected ? 'bg-green-500' : 'bg-red-400'}`}
            title={connected ? 'Connected' : 'Disconnected'}
        />
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute right-6 mt-1 w-96 max-h-96 overflow-y-auto rounded-lg shadow-lg bg-white border-gray-300 border-1">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <span className="text-sm font-semibold">Notifications</span>
            {error && <span className="text-xs text-red-500">{error}</span>}
          </div>
          {notifications.length === 0 ? (
            <div className="px-3 py-4 text-sm text-slate-500">No notifications.</div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {notifications.map((n, idx) => (
                <li
                  key={n.id ?? idx}
                  className="px-3 py-2 font-medium text-sm hover:bg-[#f8fafb] cursor-pointer"
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className="font-medium text-slate-900">
                    {n.title ?? n.type}
                  </div>
                  {n.body && (
                    <div className="text-xs text-slate-600 mt-0.5">{n.body}</div>
                  )}
                  {n.timestamp && (
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(n.timestamp).toLocaleTimeString()}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
