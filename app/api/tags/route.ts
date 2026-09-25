import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { tagDB } from '@/lib/db';

const colorPattern = /^#[0-9A-Fa-f]{6}$/;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  return NextResponse.json(tagDB.findAllByUser(session.userId));
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const color = body.color === undefined ? '#3B82F6' : body.color;
  if (!name) return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
  if (typeof color !== 'string' || !colorPattern.test(color)) {
    return NextResponse.json({ error: 'Color must be a valid hex code' }, { status: 400 });
  }

  try {
    return NextResponse.json(tagDB.create(session.userId, { name, color }), { status: 201 });
  } catch {
    return NextResponse.json({ error: 'A tag with this name already exists' }, { status: 409 });
  }
}
