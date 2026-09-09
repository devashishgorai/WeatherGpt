import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
}