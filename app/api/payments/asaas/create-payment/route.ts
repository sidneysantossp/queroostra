import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "A cobrança deve ser criada pela rota /api/checkout/create-order para garantir preço, estoque e idempotência.",
    },
    { status: 409 },
  );
}
