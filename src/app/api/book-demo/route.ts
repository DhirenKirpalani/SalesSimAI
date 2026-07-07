import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "dhiren@day1app.io";
const TO_EMAIL = "demo@day1app.io";

export async function POST(req: NextRequest) {
  try {
    const { name, email, company, teamSize, message } = await req.json();

    if (!name || !email || !company) {
      return NextResponse.json({ error: "Name, email, and company are required" }, { status: 400 });
    }

    const { data, error } = await resend.emails.send({
      from: `Day1 Demo Request <${FROM_EMAIL}>`,
      to: TO_EMAIL,
      replyTo: email,
      subject: `New demo request from ${name} at ${company}`,
      html: `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Company:</strong> ${company}</p>
        <p><strong>Team size:</strong> ${teamSize || "N/A"}</p>
        <p><strong>What they want to see:</strong></p>
        <p>${message ? message.replace(/\n/g, "<br/>") : "N/A"}</p>
      `,
    });

    if (error) {
      console.error("[book-demo] resend error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err) {
    console.error("[book-demo] unexpected error:", err);
    return NextResponse.json({ error: "Failed to send demo request" }, { status: 500 });
  }
}
