import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Create transporter - configure based on environment
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Generate verification token
// 1) Generates a cryptographically strong random token
// 2) Uses 32 random bytes 
// 3) Encodes the token as a hex string
export function generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

// Generate token expiry
// 1) Creates a Date object for "now".
// 2) Adds 24 hours to it.
// 3) Returns the resulting expiry Date.
// 4) Intended to be stored alongside the token for expiration checks.
export function generateTokenExpiry(): Date {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 24);
    return expiry;
}

// Send verification email
// 1) Builds a frontend verification URL
// 2) Prepares an HTML email template
// 3) Sends the email via the configured Nodemailer transporter
// 4) Returns true on success, false on failure
export async function sendVerificationEmail(
    email: string,
    token: string,
    username: string
): Promise<boolean> {
    const frontendUrl = process.env.FRONTEND_URL || 'https://localhost:8443';
    const verificationLink = `${frontendUrl}/api/auth/verify-email?token=${token}`;

    const mailOptions = {
        from: process.env.SMTP_USER || 'noreply@pong.com',
        to: email,
        subject: '🎮 Verify your Pong account',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #9333ea; text-align: center;">Welcome to Pong! 🏓</h1>
                
                <p style="font-size: 16px; color: #333;">Hi <strong>${username}</strong>,</p>
                
                <p style="font-size: 16px; color: #333;">
                    Thanks for signing up! Please verify your email address to activate your account.
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationLink}" 
                       style="background-color: #9333ea; color: white; padding: 15px 30px; 
                              text-decoration: none; border-radius: 8px; font-weight: bold;
                              display: inline-block;">
                        Verify Email Address
                    </a>
                </div>
                
                <p style="font-size: 14px; color: #666;">
                    Or copy and paste this link in your browser:
                    <br>
                    <a href="${verificationLink}" style="color: #9333ea;">${verificationLink}</a>
                </p>
                
                <p style="font-size: 14px; color: #666;">
                    This link will expire in 24 hours.
                </p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #999; text-align: center;">
                    If you didn't create an account, please ignore this email.
                </p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Verification email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('Failed to send verification email:', error);
        return false;
    }
}

// Verify the transporter connection
// 1) Checks that the transporter can connect or authenticate with the SMTP server
// 2) Useful during health checks to fail fast on misconfiguration
// 3) Returns true if the SMTP(Simple Mail Transfer Protocol) configuration works.
// 4) Returns false if verification fails.
export async function verifyEmailConnection(): Promise<boolean> {
    try {
        await transporter.verify();
        console.log('✅ Email service connected');
        return true;
    } catch (error) {
        console.error('❌ Email service not configured:', error);
        return false;
    }
}