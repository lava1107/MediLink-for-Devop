import {
  sendEmail,
  sendSMS,
  getCommunicationLogs,
  getActiveConfig,
  saveConfig,
} from "../services/communicationService.js";

/**
 * POST /api/communication/email
 * Send an email message
 */
export async function sendEmailController(req, res, next) {
  try {
    const to = req.body.to || req.body.recipient || req.body.email;
    const toName = req.body.toName || req.body.recipientName;
    const subject = req.body.subject || "MediLink Notification";
    const message = req.body.message || req.body.body || "";
    const { template, templateData, html } = req.body;

    if (!to) {
      return res.status(400).json({ success: false, message: "Recipient email is required" });
    }

    const result = await sendEmail({
      to,
      toName,
      subject,
      message,
      template,
      templateData,
      html,
    });

    return res.status(200).json({
      success: true,
      message: result.isRealDelivery
        ? `Email successfully sent to ${to}!`
        : `Email successfully generated with live webmail preview!`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/communication/sms
 * Send an SMS message
 */
export async function sendSMSController(req, res, next) {
  try {
    const toPhone = req.body.toPhone || req.body.phone || req.body.recipientPhone;
    const toName = req.body.toName || req.body.recipientName;
    const message = req.body.message || req.body.body;
    const { template, templateData } = req.body;

    if (!toPhone || !message) {
      return res.status(400).json({
        success: false,
        message: "Recipient phone number and message body are required",
      });
    }

    const result = await sendSMS({
      toPhone,
      toName,
      message,
      template,
      templateData,
    });

    return res.status(200).json({
      success: true,
      message: `SMS successfully sent to ${toPhone}!`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/communication/test-email
 * Send a verification test email
 */
export async function testEmailController(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required for test dispatch" });
    }

    const timeString = new Date().toLocaleString();
    const result = await sendEmail({
      to: email,
      toName: "MediLink Administrator",
      subject: "MediLink Healthcare – SMTP Live Connection Verified",
      message: `Hello! This is a real-time verification email sent from your MediLink Medical Shop Management System.\n\nTimestamp: ${timeString}\nStatus: Active & Operational\nServer: Node.js Express REST API\n\nYour pharmacy messaging gateway is operating at 100% capacity.`,
    });

    return res.status(200).json({
      success: true,
      message: `Test email sent successfully to ${email}!`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/communication/test-sms
 * Send a verification test SMS
 */
export async function testSMSController(req, res, next) {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone number is required for test dispatch" });
    }

    const result = await sendSMS({
      toPhone: phone,
      toName: "MediLink User",
      message: `[MediLink] Test Verification: Your SMS Gateway is successfully connected and operational. Sent at ${new Date().toLocaleTimeString()}.`,
    });

    return res.status(200).json({
      success: true,
      message: `Test SMS sent successfully to ${phone}!`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/communication/logs
 * Retrieve log history of all sent communications
 */
export async function getLogsController(req, res, next) {
  try {
    const { type, limit, offset } = req.query;
    const logs = await getCommunicationLogs({ type, limit, offset });
    return res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/communication/config
 * Get active communication gateway credentials (masked)
 */
export async function getConfigController(req, res, next) {
  try {
    const config = await getActiveConfig();
    // Mask sensitive passwords/tokens
    const masked = {
      smtpHost: config.smtpHost,
      smtpPort: config.smtpPort,
      smtpUser: config.smtpUser,
      smtpPass: config.smtpPass ? "••••••••••••" : "",
      smtpFrom: config.smtpFrom,
      smtpSecure: config.smtpSecure,
      twilioSid: config.twilioSid ? `${config.twilioSid.slice(0, 6)}••••••••` : "",
      twilioToken: config.twilioToken ? "••••••••••••" : "",
      twilioFrom: config.twilioFrom,
      smsProvider: config.smsProvider,
      isConfigured: Boolean(config.smtpUser && config.smtpPass),
      isTwilioConfigured: Boolean(config.twilioSid && config.twilioToken),
    };
    return res.status(200).json({
      success: true,
      data: masked,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/communication/config
 * Update communication configuration
 */
export async function updateConfigController(req, res, next) {
  try {
    const current = await getActiveConfig();
    const update = {
      smtpHost: req.body.smtpHost !== undefined ? req.body.smtpHost : current.smtpHost,
      smtpPort: req.body.smtpPort !== undefined ? req.body.smtpPort : current.smtpPort,
      smtpUser: req.body.smtpUser !== undefined ? req.body.smtpUser : current.smtpUser,
      smtpPass: req.body.smtpPass && req.body.smtpPass !== "••••••••••••" ? req.body.smtpPass : current.smtpPass,
      smtpFrom: req.body.smtpFrom !== undefined ? req.body.smtpFrom : current.smtpFrom,
      smtpSecure: req.body.smtpSecure !== undefined ? req.body.smtpSecure : current.smtpSecure,
      twilioSid: req.body.twilioSid && !req.body.twilioSid.includes("••") ? req.body.twilioSid : current.twilioSid,
      twilioToken: req.body.twilioToken && req.body.twilioToken !== "••••••••••••" ? req.body.twilioToken : current.twilioToken,
      twilioFrom: req.body.twilioFrom !== undefined ? req.body.twilioFrom : current.twilioFrom,
      smsProvider: req.body.smsProvider || current.smsProvider,
    };

    await saveConfig(update);
    return res.status(200).json({
      success: true,
      message: "Communication gateway configuration saved successfully!",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/communication/quick-send
 * Quick trigger for common medical flows (bill, prescription, reservation, restock)
 */
export async function quickSendController(req, res, next) {
  try {
    const { channel = "both", email, phone, name, template, data } = req.body;
    const results = {};

    if ((channel === "email" || channel === "both") && email) {
      try {
        let subject = "MediLink Notification";
        let message = "Please find details regarding your pharmacy service.";

        if (template === "invoice") {
          subject = `MediLink Medical Invoice #${data?.invoiceNo || ""}`;
          message = `Thank you for choosing MediLink. Your medical bill #${data?.invoiceNo || ""} for ₹${data?.total || 0} is confirmed. Please find your itemized receipt below.`;
        } else if (template === "prescription") {
          subject = `MediLink – Prescription #${data?.prescriptionId || ""} Ready for Pickup`;
          message = `Good news! Your prescription #${data?.prescriptionId || ""} has been verified and is packed ready at ${data?.branch || "our branch"}.`;
        } else if (template === "reservation") {
          subject = `MediLink – Medicine Reservation Confirmed (${data?.medicineName || ""})`;
          message = `Your reservation for ${data?.quantity || 1} unit(s) of ${data?.medicineName || "medicine"} has been placed successfully.`;
        }

        results.email = await sendEmail({
          to: email,
          toName: name,
          subject,
          message,
          template,
          templateData: data,
        });
      } catch (e) {
        results.emailError = e.message;
      }
    }

    if ((channel === "sms" || channel === "both") && phone) {
      try {
        let smsText = `[MediLink] Hi ${name || "Customer"}, your pharmacy update is confirmed. Call +919003122110 for queries.`;

        if (template === "invoice") {
          smsText = `[MediLink] Bill #${data?.invoiceNo || ""}: Total ₹${data?.total || 0} (GST inc). Thank you for shopping with MediLink!`;
        } else if (template === "prescription") {
          smsText = `[MediLink] Prescription #${data?.prescriptionId || ""} is READY FOR PICKUP at ${data?.branch || "MediLink"}. Counter hours: 8AM-10PM.`;
        } else if (template === "reservation") {
          smsText = `[MediLink] Reservation Confirmed for ${data?.medicineName || "Medicine"}. Code: ${data?.reservationCode || "RES-1"}. Held for 24h.`;
        }

        results.sms = await sendSMS({
          toPhone: phone,
          toName: name,
          message: smsText,
          template,
          templateData: data,
        });
      } catch (e) {
        results.smsError = e.message;
      }
    }

    return res.status(200).json({
      success: true,
      message: "Communication dispatched successfully!",
      data: results,
    });
  } catch (error) {
    next(error);
  }
}
