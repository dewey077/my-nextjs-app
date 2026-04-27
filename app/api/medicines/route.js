import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const medicinesDb = [
  { id: "1", name: "Paracetamol", quantity: 150, sales: 340, threshold: 50, price: 15, expiryDate: "2027-12-01" },
  { id: "2", name: "Amoxicillin", quantity: 12, sales: 85, threshold: 20, price: 50, expiryDate: "2026-05-15" }, // Expiring soon!
  { id: "3", name: "Citrizine", quantity: 80, sales: 120, threshold: 30, price: 10, expiryDate: "2028-01-10" },
  { id: "4", name: "Ibuprofen", quantity: 4, sales: 210, threshold: 40, price: 25, expiryDate: "2027-08-20" }, 
];

export async function GET() {
  const response = NextResponse.json({ medicines: medicinesDb });
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  return response;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const newMedicine = {
      id: Date.now().toString(),
      name: body.name,
      quantity: Number(body.quantity) || 0,
      sales: 0, 
      threshold: Number(body.threshold) || 20,
      price: Number(body.price) || 0, 
      expiryDate: body.expiryDate || "2025-12-31" // New Field
    };

    medicinesDb.push(newMedicine); 
    return NextResponse.json({ message: "Added successfully", medicine: newMedicine }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to add medicine" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const sellAmount = Number(body.amount) || 1; 
    const index = medicinesDb.findIndex((m) => String(m.id) === String(body.id));
    
    if (index !== -1) {
      if (medicinesDb[index].quantity >= sellAmount) {
        medicinesDb[index].quantity -= sellAmount;
        medicinesDb[index].sales += sellAmount;
        return NextResponse.json({ message: "Sale recorded", medicine: medicinesDb[index] });
      } else {
        return NextResponse.json({ error: "Not enough stock" }, { status: 400 });
      }
    }
    return NextResponse.json({ error: "Medicine not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process sale" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const index = medicinesDb.findIndex((m) => String(m.id) === String(id));
    if (index !== -1) medicinesDb.splice(index, 1);
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}