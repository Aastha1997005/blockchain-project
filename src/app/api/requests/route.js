import { NextResponse } from 'next/server';
import { openDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await openDb();
    // Fetch all requests ordered by latest first
    const requests = await db.all('SELECT * FROM requests ORDER BY timestamp DESC');
    return NextResponse.json({ success: true, requests });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { userAddress, cid } = await req.json();
    if (!userAddress || !cid) {
      return NextResponse.json({ success: false, error: "Missing data" }, { status: 400 });
    }

    const db = await openDb();
    
    // Check submission count
    const countResult = await db.get('SELECT COUNT(*) as count FROM requests WHERE LOWER(userAddress) = LOWER(?)', [userAddress]);
    if (countResult.count >= 4) {
      return NextResponse.json({ success: false, error: "Maximum submission limit reached" }, { status: 403 });
    }

    // Save new verification request off-chain
    await db.run('INSERT INTO requests (userAddress, cid) VALUES (?, ?)', [userAddress, cid]);
    return NextResponse.json({ success: true, message: "Request saved off-chain successfully" });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { id, status } = await req.json();
    if (!id || !status) {
      return NextResponse.json({ success: false, error: "Missing data" }, { status: 400 });
    }

    const db = await openDb();
    // Update the verification status (Approved/Rejected)
    await db.run('UPDATE requests SET status = ? WHERE id = ?', [status, id]);
    return NextResponse.json({ success: true, message: "Status updated off-chain" });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
