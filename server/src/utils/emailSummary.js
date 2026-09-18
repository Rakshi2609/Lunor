import axios from 'axios';
import nodemailer from 'nodemailer';

const APPSCRIPT_URL = process.env.APPSCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxV1eS8bKkTVHA6N6vGo_1lDHrJ7qXBR_2QF20Tza-UEyfudjIzOEMM4HQUlK3XYhMTIg/exec';

// Configure optional direct SMTP transporter (e.g. Gmail App Password, SendGrid, Mailgun)
const createSmtpTransporter = () => {
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASS || process.env.GMAIL_APP_PASSWORD;
  if (!smtpUser || !smtpPass) return null;

  return nodemailer.createTransport({
    service: process.env.SMTP_SERVICE || 'gmail',
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });
};

/**
 * Send email using Google Apps Script Web App (or direct SMTP fallback)
 * @param {string} to - Recipient email
 * @param {string} subject - Subject of the email
 * @param {string} html - HTML body of the email
 */
export const sendMailViaAppScript = async (to, subject, html) => {
  if (!to || !subject || !html) {
    throw new Error('Missing required fields for sending email');
  }

  // 1. If direct SMTP credentials are provided, use nodemailer
  const transporter = createSmtpTransporter();
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: `"Danzo Workspace" <${process.env.SMTP_USER || process.env.GMAIL_USER}>`,
        to,
        subject,
        html
      });
      console.log(`✅ Email sent successfully to ${to} via direct SMTP. ID:`, info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (smtpErr) {
      console.error(`⚠️ SMTP dispatch error to ${to}:`, smtpErr.message);
    }
  }

  // 2. Dispatch via Google Apps Script Web App
  try {
    const response = await axios.post(APPSCRIPT_URL, { to, subject, html }, {
      headers: { 'Content-Type': 'application/json' },
      maxRedirects: 5,
      timeout: 10000
    });
    if (response.data && response.data.success) {
      console.log(`✅ Email sent successfully to ${to} via Google Apps Script.`);
      return response.data;
    } else {
      return response.data;
    }
  } catch (err) {
    console.error(`❌ Error sending email to ${to} via Google Apps Script:`, err.message);
    throw err;
  }
};

/**
 * Send OTP Verification Email to user on sign-in (Light Theme)
 */
export const sendOtpEmail = async (to, otp, displayName = '') => {
  const name = displayName || to.split('@')[0];
  const subject = `${otp} is your Danzo verification code`;
  const html = `
<div style="background-color: #f8fafc; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100%; color: #0f172a;">
  <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px 28px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
    
    <!-- Brand Header -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 12px; background: #0f172a; color: #ffffff; font-weight: 800; font-size: 16px; letter-spacing: -0.5px;">
        DANZO
      </div>
      <h1 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 12px 0 4px 0; letter-spacing: -0.5px;">
        Danzo Workspace Verification
      </h1>
      <p style="font-size: 13px; color: #64748b; margin: 0;">
        Sign-in verification for <strong style="color: #0f172a;">${to}</strong>
      </p>
    </div>

    <!-- Main OTP Block -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
      <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin: 0 0 12px 0;">
        Your 6-Digit One-Time Password
      </p>
      <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f172a; font-family: monospace; padding: 12px 0; background: #ffffff; border-radius: 8px; border: 1px dashed #cbd5e1;">
        ${otp}
      </div>
      <p style="font-size: 11px; color: #64748b; margin: 12px 0 0 0;">
        Valid for <strong style="color: #0f172a;">10 minutes</strong>. Do not share this code with anyone.
      </p>
    </div>

    <!-- Security Info -->
    <div style="border-top: 1px solid #e2e8f0; padding-top: 18px; font-size: 12px; color: #475569; line-height: 1.6;">
      <p style="margin: 0 0 6px 0;">
        Hi <strong>${name}</strong>, enter this code on the sign-in screen to access your workspace.
      </p>
      <p style="margin: 0; font-size: 11px; color: #94a3b8;">
        If you did not request this verification code, you can safely ignore this email.
      </p>
    </div>

  </div>

  <!-- Footer -->
  <div style="text-align: center; margin-top: 20px; font-size: 11px; color: #94a3b8;">
    © ${new Date().getFullYear()} Danzo Productivity Platform. All rights reserved.
  </div>
</div>
`;

  console.log(`\n========================================`);
  console.log(`🔐 [OTP DISPATCH] Recipient: ${to}`);
  console.log(`🔑 [OTP CODE]: ${otp}`);
  console.log(`========================================\n`);

  try {
    const result = await sendMailWithRetry(to, subject, html, [], 2, 2000);
    return result;
  } catch (err) {
    console.warn(`⚠️ Email notification attempt:`, err.message);
    return { success: false, error: err.message, localOtp: otp };
  }
};

/**
 * Send email with retry mechanism using AppScript
 */
export const sendMailWithRetry = async (to, subject, html, cc = [], maxRetries = 3, retryDelay = 5000) => {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      attempt++;
      return await sendMailViaAppScript(to, subject, html);
    } catch (error) {
      console.error(`❌ Attempt ${attempt}/${maxRetries} failed:`, error.message);
      if (attempt >= maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
};

// For compatibility: sendMail now uses AppScript
export const sendMail = async (to, subject, content, cc = []) => {
  // If content is not HTML, wrap it in <pre> for basic formatting
  const isHTML = /<[a-z][\s\S]*>/i.test(content);
  const html = isHTML ? content : `<pre>${content}</pre>`;
  return sendMailViaAppScript(to, subject, html);
};

// backend/models/SummaryStatus.js
import mongoose from 'mongoose';

const SummaryStatusSchema = new mongoose.Schema({
  email: { type: String, required: true },
  date: { type: String, required: true }, // e.g., '2025-07-09'
});

export const SummaryStatus = mongoose.model('SummaryStatus', SummaryStatusSchema);

const hasSentToday = async (email) => {
  const today = new Date().toISOString().split('T')[0];
  const status = await SummaryStatus.findOne({ email, date: today });
  return !!status;
};

const markSent = async (email) => {
  const today = new Date().toISOString().split('T')[0];
  await SummaryStatus.create({ email, date: today });
};

// backend/utils/checkAndSendDailySummary.js
import User from '../models/User.js';
import Task from '../models/Task.js';

export const checkAndSendDailySummary = async (userEmail, force = false) => {
  console.log(`📩 [checkAndSendDailySummary] Starting for ${userEmail}`);

  try {
    if (!force) {
      const alreadySent = await hasSentToday(userEmail);
      if (alreadySent) {
        console.log(`⏭️ Summary already sent today for ${userEmail}`);
        return { skipped: true, reason: 'Already sent today' };
      }
    }

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      console.log(`❌ No user found for ${userEmail}`);
      return { error: 'User not found' };
    }

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const tasksToday = await Task.find({
      assignedTo: user._id,
      dueDate: { $gte: startOfDay, $lte: endOfDay }
    });

    const completed = tasksToday.filter(t => t.status === 'Completed').length;
    const pending = tasksToday.length - completed;

    // Overdue tasks (before today and not completed)
    const overdueTasks = await Task.find({
      assignedTo: user._id,
      dueDate: { $lt: startOfDay },
      status: { $ne: 'Completed' }
    });

    // Tomorrow’s tasks
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startOfTomorrow = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0, 0);
    const endOfTomorrow = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59, 999);

    const tasksTomorrow = await Task.find({
      assignedTo: user._id,
      dueDate: { $gte: startOfTomorrow, $lte: endOfTomorrow }
    });

    const dateFormatted = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date());

    // Clean Light Theme HTML Summary Template
    const summaryHtml = `
<div style="background-color: #f8fafc; padding: 36px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100%; color: #0f172a;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px 28px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
    
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 12px; background: #0f172a; color: #ffffff; font-weight: 800; font-size: 16px;">
        DANZO
      </div>
      <h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 12px 0 2px 0; letter-spacing: -0.5px;">
        Daily Productivity Summary
      </h1>
      <p style="font-size: 13px; color: #64748b; margin: 0; font-weight: 500;">
        ${dateFormatted}
      </p>
    </div>

    <!-- User Greeting -->
    <div style="margin-bottom: 20px;">
      <p style="font-size: 14px; color: #334155; margin: 0;">
        Hi <strong>${user.displayName || user.username || userEmail}</strong>, here is your workspace overview for today:
      </p>
    </div>

    <!-- Metrics Bar (Light Theme Pills) -->
    <div style="display: flex; gap: 8px; margin-bottom: 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
        <tr>
          <td width="33%" style="padding: 4px;">
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 12px 8px; text-align: center;">
              <div style="font-size: 20px; font-weight: 800; color: #16a34a;">${completed}</div>
              <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #15803d; letter-spacing: 0.5px;">Completed</div>
            </div>
          </td>
          <td width="33%" style="padding: 4px;">
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 8px; text-align: center;">
              <div style="font-size: 20px; font-weight: 800; color: #3b82f6;">${pending}</div>
              <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #1d4ed8; letter-spacing: 0.5px;">Pending</div>
            </div>
          </td>
          <td width="33%" style="padding: 4px;">
            <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 10px; padding: 12px 8px; text-align: center;">
              <div style="font-size: 20px; font-weight: 800; color: #e11d48;">${overdueTasks.length}</div>
              <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #be123c; letter-spacing: 0.5px;">Overdue</div>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Today's Tasks Section -->
    <div style="margin-bottom: 20px;">
      <h3 style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin: 0 0 10px 0;">
        Today's Schedule (${tasksToday.length})
      </h3>
      ${tasksToday.length > 0 ? `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 12px;">
          ${tasksToday.map(t => `
            <div style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; display: flex; align-items: center; justify-content: space-between;">
              <span style="${t.status === 'Completed' ? 'text-decoration: line-through; color: #94a3b8;' : 'color: #0f172a; font-weight: 500;'}">
                ${t.status === 'Completed' ? '[Completed]' : '[Pending]'} ${t.title}
              </span>
              <span style="font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 6px; background: ${t.status === 'Completed' ? '#dcfce7; color: #15803d;' : '#e0f2fe; color: #0369a1;'}">
                ${t.status}
              </span>
            </div>
          `).join('')}
        </div>
      ` : `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; text-align: center; font-size: 13px; color: #64748b;">
          No tasks scheduled for today. Great time to plan ahead!
        </div>
      `}
    </div>

    <!-- Overdue Section if any -->
    ${overdueTasks.length > 0 ? `
      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #e11d48; margin: 0 0 10px 0;">
          Action Required (${overdueTasks.length} Overdue)
        </h3>
        <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 10px; padding: 8px 12px;">
          ${overdueTasks.map(t => `
            <div style="padding: 6px 0; font-size: 13px; color: #9f1239; font-weight: 500;">
              • ${t.title}
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <!-- Tomorrow's Upcoming Tasks -->
    ${tasksTomorrow.length > 0 ? `
      <div style="margin-bottom: 24px;">
        <h3 style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin: 0 0 10px 0;">
          Tomorrow's Priorities (${tasksTomorrow.length})
        </h3>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 12px;">
          ${tasksTomorrow.map(t => `
            <div style="padding: 6px 0; font-size: 13px; color: #334155;">
              • ${t.title}
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <!-- CTA Button -->
    <div style="text-align: center; margin: 28px 0 12px 0;">
      <a href="https://denzo.onrender.com" target="_blank" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 13px; font-weight: 600; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);">
        Open Workspace ➔
      </a>
    </div>

    <!-- Motivational Signoff -->
    <div style="border-top: 1px solid #e2e8f0; margin-top: 20px; padding-top: 16px; text-align: center; font-size: 12px; color: #64748b;">
      Keep up the momentum!
    </div>

  </div>

  <!-- Footer -->
  <div style="text-align: center; margin-top: 20px; font-size: 11px; color: #94a3b8;">
    © ${new Date().getFullYear()} Danzo Productivity Platform. All rights reserved.
  </div>
</div>
`;

    await sendMail(userEmail, `Danzo Daily Summary: ${dateFormatted}`, summaryHtml);
    await markSent(userEmail);
    console.log(`✅ Summary sent and marked for ${userEmail}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ checkAndSendDailySummary error for ${userEmail}:`, error.message);
    throw error;
  }
};

// backend/utils/triggerDailySummaries.js

export const triggerDailySummaries = async () => {
  const currentHour = new Date().getHours();
  console.log(`⏰ Current hour: ${currentHour}`);
  
  if (currentHour < 18) {
    console.log('⏰ Too early for summary. Skipping...');
    return;
  }

  console.log('📧 Starting daily summaries for all users...');
  const users = await User.find({}); 
  console.log(`👥 Found ${users.length} users to process`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const user of users) {
    try {
      await checkAndSendDailySummary(user.email);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to send summary to ${user.email}:`, error.message);
      failCount++;
    }
  }
  
  console.log(`✅ Summary sending complete: ${successCount} sent, ${failCount} failed`);
};
