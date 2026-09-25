import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { tagDB } from '@/lib/db';

const colorPattern = /^#[0-9A-Fa-f]{6}$/;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { id } = await params;
  const tagId = Number(id);
  if (!tagDB.findById(tagId, session.userId)) return NextResponse.json({ error: 'Tag not found' }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const name = body.name === undefined ? undefined : typeof body.name === 'string' ? body.name.trim() : '';
  const color = body.color;
  if (name === '') return NextResponse.json({ error: 'Tag name cannot be empty' }, { status: 400 });
  if (color !== undefined && (typeof color !== 'string' || !colorPattern.test(color))) {
    return NextResponse.json({ error: 'Color must be a valid hex code' }, { status: 400 });
  }

  try {
    return NextResponse.json(tagDB.update(tagId, session.userId, { name, color: color as string | undefined }));
  } catch {
    return NextResponse.json({ error: 'A tag with this name already exists' }, { status: 409 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { id } = await params;
  const tagId = Number(id);
  if (!tagDB.findById(tagId, session.userId)) return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
  tagDB.delete(tagId, session.userId);
  return NextResponse.json({ success: true });
}
