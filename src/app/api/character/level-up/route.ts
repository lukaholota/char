import { NextRequest, NextResponse } from 'next/server';
import { getLevelUpSteps } from '@/lib/actions/character-logic';
import { confirmLevelUp } from '@/lib/actions/character-transaction';
import { confirmMulticlassLevelUp } from '@/lib/actions/character-transaction-multiclass';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const persId = Number(searchParams.get('persId'));
  const classId = searchParams.get('classId') ? Number(searchParams.get('classId')) : undefined;

  if (!persId) {
    return NextResponse.json({ error: 'Missing persId' }, { status: 400 });
  }

  try {
    const result = await getLevelUpSteps(persId, classId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching level up steps:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { persId, choices, isMulticlass } = body;

    if (!persId || !choices) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let result;
    if (isMulticlass) {
        result = await confirmMulticlassLevelUp({ persId, choices });
    } else {
        // We need to determine the new level. In a real app, this comes from the session or calculated
        // For now, we'll fetch the character and increment
        // This logic should ideally be inside confirmLevelUp or passed from client securely
        // Simplified for this example:
        const newLevel = 2; // Placeholder! Logic needs to be robust
        result = await confirmLevelUp({ persId, choices, newLevel });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error confirming level up:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
