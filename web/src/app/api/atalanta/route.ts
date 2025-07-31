import { NextRequest, NextResponse } from 'next/server';

// Placeholder for Atalanta execution API routes
export async function POST(_request: NextRequest) {
  return NextResponse.json({ message: 'Atalanta execution API endpoint' });
}

export async function GET(_request: NextRequest) {
  return NextResponse.json({ message: 'Atalanta status API endpoint' });
}