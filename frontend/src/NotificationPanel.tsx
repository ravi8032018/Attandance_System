'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type NotificationMessage = {
  type: string;
  title?: string;
  body?: string;
  timestamp?: string;
  session_id?: string;
  subject_code?: string;
  batch_id?: string;
  token?: string;
  expires_at?: string;
};

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000';

export function NotificationPanel() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Important: same origin or matching domain so cookies are sent
    const socket = new WebSocket(`${WS_BASE_URL}/ws/notify`);

    socket.addEventListener('open', () => {
      setConnected(true);
      setError(null);
    });

    socket.addEventListener('message', (event) => {
      try {
        const data: NotificationMessage = JSON.parse(event.data);
        setNotifications((prev) => [data, ...prev]); // latest on top
      } catch (e) {
        console.error('Invalid message from WS', e, event.data);
      }
    });

    socket.addEventListener('close', () => {
      setConnected(false);
    });

    socket.addEventListener('error', (event) => {
      console.error('WebSocket error', event);
      setError('WebSocket error');
    });

    setWs(socket);

    return () => {
      socket.close();
    };
  }, []);

  return (
    <div className="border rounded-2xl p-4 w-full max-w-2xl bg-white shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">Notifications</h2>
        <span
          className={`h-2 w-2 rounded-full ${
            connected ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
      </div>

      {error && (
        <p className="text-sm text-red-500 mb-2">
          {error}
        </p>
      )}

      {notifications.length === 0 ? (
        <p className="text-sm text-gray-500">
          No notifications yet. Trigger something from backend to test.
        </p>
      ) : (
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {notifications.map((n, idx) => (
            <li
              key={idx}
              className="border rounded p-2 text-sm bg-gray-50"
            >
              <div className="font-medium">
                {n.title ?? n.type}
              </div>

              {/* Special rendering for CR attendance session */}
              {n.type === 'cr_attendance_session_started' ? (
                <div className="space-y-1">
                  <div className="text-gray-700">
                    New CR attendance session started for {n.subject_code} ({n.batch_id}).
                  </div>
                  {n.expires_at && (
                    <div className="text-xs text-gray-500">
                      Expires at: {new Date(n.expires_at).toLocaleTimeString()}
                    </div>
                  )}
                  {n.token && (
                    <div className="text-xs text-gray-600">
                      Token: <span className="font-mono">{n.token}</span>
                    </div>
                  )}
                  <button
                    className="mt-1 inline-flex items-center px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
                    onClick={() => {
                      const searchParams = new URLSearchParams();
                      if (n.session_id) searchParams.set('session_id', n.session_id);
                      if (n.token) searchParams.set('token', n.token);

                      router.push(`/cr/attendance?${searchParams.toString()}`);
                    }}
                  >
                    Open attendance
                  </button>
                </div>
              ) : (
                <>
                  {n.body && (
                    <div className="text-gray-700">
                      {n.body}
                    </div>
                  )}
                </>
              )}

              {n.timestamp && (
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(n.timestamp).toLocaleTimeString()}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
