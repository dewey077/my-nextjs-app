import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    
    // SERVER LOG: This simulates the email hitting an external server like SendGrid!
    console.log(" ");
    console.log("📩 === AUTOMATED MANAGER ALERT SENT ===");
    console.log(`To: procurement@meditrack.com`);
    console.log(`Subject: URGENT RESTOCK - ${body.name}`);
    console.log(`Message: ${body.name} has dropped to ${body.quantity} units (Threshold: ${body.threshold}). Please approve purchase order.`);
    console.log("=======================================");
    console.log(" ");

    // Simulate a slight network delay so the button feels real
    await new Promise(resolve => setTimeout(resolve, 800));

    return NextResponse.json({ message: "Manager notified successfully" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}