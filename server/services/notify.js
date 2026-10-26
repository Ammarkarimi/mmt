/* Outbound messages. SMS goes to SMS_WEBHOOK_URL (adapt it to MSG91, Twilio, Gupshup…) when set. */

export async function sendOtpSms(config, phone, code) {
  const message = `${code} is your TripSaathi login code. It expires in 5 minutes. Do not share it with anyone.`;
  if (!config.smsWebhookUrl) {
    if (!config.otpDemo) console.warn('[sms] SMS_WEBHOOK_URL is not set; OTP for', phone.slice(0, 2) + '******' + phone.slice(-2), 'was not delivered');
    return { delivered: false };
  }
  const res = await fetch(config.smsWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: `+91${phone}`, message }),
  });
  if (!res.ok) throw new Error(`SMS webhook responded ${res.status}`);
  return { delivered: true };
}
