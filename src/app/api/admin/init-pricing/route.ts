import { NextRequest, NextResponse } from 'next/server';
import { initializeDefaultSettings } from '@/lib/firebase/settings';

export async function POST(request: NextRequest) {
  try {
    await initializeDefaultSettings();

    return NextResponse.json({
      success: true,
      message: 'Default pricing settings initialized successfully',
      settings: {
        ai: 0.05,
        hybrid: 1.50,
        human: 2.50
      }
    });
  } catch (error: any) {
    console.error('Error initializing pricing settings:', error);
    return NextResponse.json(
      {
        error: 'Failed to initialize pricing settings',
        details: error.message
      },
      { status: 500 }
    );
  }
}
