import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    notifications: [
      {
        id: 1,
        title: 'Centralized Admission Circular 2026-2027',
        message: 'Applications are currently open for all 12 universities including DU, BUET, and KYAU.',
        type: 'info',
        is_read: false,
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        title: 'KYAU Merit List Published',
        message: 'First merit list for CSE, EEE, and Pharmacy is available for inspection.',
        type: 'success',
        is_read: false,
        created_at: new Date().toISOString()
      }
    ],
    unreadCount: 2
  });
}
