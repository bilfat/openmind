import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const DEV_SERVER = 'http://localhost:3000';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

async function setup() {
    console.log('--- Setting up test data ---');
    const { data: event } = await supabaseAdmin.from('events').select('id').eq('status', 'ACTIVE').single();
    if (!event) throw new Error("No active event found to run tests.");

    const { data: pt, error: ptError } = await supabaseAdmin.from('ticket_types').insert({ event_id: event.id, name: 'Paid Test Ticket', code: `P${Date.now()}`, ticket_type: 'PAID', base_price: 60000, final_price: 50000, quota: 10, min_purchase: 1, max_purchase: 5, sales_start_at: new Date(), sales_end_at: new Date(Date.now() + 86400000), status: 'ACTIVE' }).select().single();
    if (ptError) throw ptError;

    const { data: ft, error: ftError } = await supabaseAdmin.from('ticket_types').insert({ event_id: event.id, name: 'Free Test Ticket', code: `F${Date.now()}`, ticket_type: 'FREE', base_price: 0, final_price: 0, quota: 5, min_purchase: 1, max_purchase: 2, sales_start_at: new Date(), sales_end_at: new Date(Date.now() + 86400000), status: 'ACTIVE' }).select().single();
    if (ftError) throw ftError;

    console.log('Test tickets created.');
    return { paidTicket: pt, freeTicket: ft };
}

async function cleanup(paidTicket, freeTicket) {
    if (!paidTicket || !freeTicket) return;
    console.log('--- Cleaning up test data ---');
    await supabaseAdmin.from('ticket_types').delete().in('id', [paidTicket.id, freeTicket.id]);
    // Also clean up any orders/participants created
    console.log('Test tickets deleted.');
}

async function runTest(name, payload, expected) {
    console.log(`\n--- Running test: ${name} ---`);
    let pass = false;
    try {
        const res = await fetch(`${DEV_SERVER}/api/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (expected.status && res.status !== expected.status) {
            console.log(`Expected status ${expected.status}, got ${res.status}`);
        } else if (expected.success !== undefined && result.success !== expected.success) {
            console.log(`Expected success=${expected.success}, got ${result.success}`);
        } else if (expected.messageContains && !result.message?.includes(expected.messageContains)) {
            console.log(`Expected message to contain "${expected.messageContains}", got "${result.message}"`);
        } else {
            pass = true;
        }
    } catch (e) {
        console.log(`Error: ${e.message}`);
    }
    console.log(`Result: ${pass ? 'PASS' : 'FAIL'}`);
    return pass;
}

async function runAllTests() {
    let paidTicket, freeTicket;
    try {
        ({ paidTicket, freeTicket } = await setup());

        const participant1 = { fullName: 'Test User 1', email: 'test1@example.com', whatsapp: '0811111111', nim: '111111', faculty: 'FIT', studyProgram: 'D3SI', instagram: 'test1' };
        const participant2 = { fullName: 'Test User 2', email: 'test2@example.com', whatsapp: '0822222222', nim: '222222', faculty: 'FRI', studyProgram: 'TI', instagram: 'test2' };
        const participant3 = { fullName: 'Test User 3', email: 'test3@example.com', whatsapp: '0833333333', nim: '333333', faculty: 'FIF', studyProgram: 'IF', instagram: 'test3' };


        await runTest('1. Single Paid Ticket', {
            ticketSelections: [{ ticketId: paidTicket.id, quantity: 1 }],
            participants: [participant1]
        }, { status: 200, success: true });
        
        await runTest('2. Multi-participant Paid Ticket', {
            ticketSelections: [{ ticketId: paidTicket.id, quantity: 3 }],
            participants: [participant1, participant2, participant3]
        }, { status: 200, success: true });
        
        await runTest('3. Single Free Ticket', {
            ticketSelections: [{ ticketId: freeTicket.id, quantity: 1 }],
            participants: [participant1]
        }, { status: 200, success: true });
        
        await runTest('4. Insufficient Quota', {
            ticketSelections: [{ ticketId: freeTicket.id, quantity: 10 }],
            participants: Array(10).fill(participant1)
        }, { status: 400, success: false, messageContains: 'Kuota' }); // Check for quota validation error
        
        await runTest('5. Price Tampering (Client sends wrong price)', {
            ticketSelections: [{ ticketId: paidTicket.id, quantity: 1, price: 1000 }],
            participants: [participant1]
        }, { status: 200, success: true });
        
        await runTest('6. Rollback on Invalid Participant Data', {
            ticketSelections: [{ ticketId: paidTicket.id, quantity: 1 }],
            participants: [{...participant1, email: 'invalid-email'}]
        }, { status: 400, success: false, messageContains: 'Data yang dikirim tidak valid' });
        
        console.log('\n--- All tests complete ---');
    } catch (e) {
        console.error("A critical error occurred during test execution:", e);
    }
    finally {
        await cleanup(paidTicket, freeTicket);
    }
}

runAllTests();
