import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
    try {
        const { email, full_name, verification_token } = await JSON.parse(await req.text());

        if (!email || !verification_token) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const frontendUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ev-scheduler-app.vercel.app';
        const verificationLink = `${frontendUrl}/verify-email?token=${verification_token}`;

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'tarun.ganapathi2007@gmail.com',
                pass: process.env.MAIL_PASSWORD,
            },
        });

        const mailOptions = {
            from: '"Smart EV Scheduler" <tarun.ganapathi2007@gmail.com>',
            to: email,
            subject: 'Verify Your Smart EV Scheduler Account',
            html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #0f172a; color: #ffffff; padding: 40px; text-align: center;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; padding: 40px; border-radius: 16px; border: 1px solid #10b981;">
            <h1 style="color: #10b981;">Verify Your Email</h1>
            <p>Hello ${full_name},</p>
            <p>Thank you for signing up for Smart EV Scheduler! Please verify your email to get started.</p>
            <div style="margin: 40px 0;">
              <a href="${verificationLink}" style="background-color: #10b981; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold;">
                Verify Email Address
              </a>
            </div>
            <p style="font-size: 12px; color: #64748b;">If you didn't create an account, you can ignore this email.</p>
          </div>
        </body>
        </html>
      `,
        };

        await transporter.sendMail(mailOptions);
        return NextResponse.json({ status: 'success', message: 'Verification email sent' });

    } catch (error) {
        console.error('Email Error:', error);
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }
}
