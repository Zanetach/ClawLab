import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    const { stdout } = await execAsync('openclaw gateway call agents.list 2>/dev/null', {
      timeout: 10000,
    });

    // Extract JSON from the output (openclaw outputs text + JSON)
    const jsonStart = stdout.indexOf('{');
    const jsonEnd = stdout.lastIndexOf('}') + 1;
    const jsonStr = stdout.slice(jsonStart, jsonEnd);

    const data = JSON.parse(jsonStr);
    const agents = data.agents || [];

    return NextResponse.json(agents);
  } catch (error) {
    console.error('Failed to get agents:', error);
    return NextResponse.json(
      { error: 'Failed to get agents' },
      { status: 500 }
    );
  }
}
