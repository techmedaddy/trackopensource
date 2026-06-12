import { NextResponse } from "next/server";

export async function GET() {
  let backendRes = null;
  let backendText = "";
  try {
      backendRes = await fetch("http://backend:8080/api/trending");
      backendText = await backendRes.text();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch(err: any) {
      backendText = err.message + " | " + err.cause?.message + " | " + err.code;
  }

  return NextResponse.json({ 
      backend_status: backendRes?.status || "FAILED",
      backend_body: backendText
  });
}
