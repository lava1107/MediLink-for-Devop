import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../config/db.js";
import { JWT_SECRET } from "../config/env.js";
import { success, error } from "../utils/response.js";

export async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return error(res, "Please enter both username and password.", 400);
    }

    // Find user by username or email
    const users = await query(
      `SELECT u.id, u.name, u.username, u.email, u.password_hash, u.phone, u.status,
              r.name AS role, b.name AS branch, b.id AS branch_id
       FROM users u
       JOIN roles r ON u.role_id = r.id
       JOIN branches b ON u.branch_id = b.id
       WHERE LOWER(u.username) = LOWER(?) OR LOWER(u.email) = LOWER(?)`,
      [username, username]
    );

    if (users.length === 0) {
      return error(res, "No account found with that username or email.", 401);
    }

    const user = users[0];

    if (user.status !== "Active") {
      return error(res, "This account has been deactivated. Contact your administrator.", 403);
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return error(res, "Invalid credentials. Please check your password.", 401);
    }

    // Format last login timestamp
    const now = new Date();
    const lastLoginFormatted = now.toISOString().slice(0, 10) + " " + now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    await query("UPDATE users SET last_login = ? WHERE id = ?", [lastLoginFormatted, user.id]);

    const payload = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      branch: user.branch,
      branchId: user.branch_id,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

    return success(res, {
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        branch: user.branch,
        branchId: user.branch_id,
        status: user.status,
        lastLogin: lastLoginFormatted,
      },
    }, "Login successful");
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    const users = await query(
      `SELECT u.id, u.name, u.username, u.email, u.phone, u.status, u.last_login,
              r.name AS role, b.name AS branch, b.id AS branch_id
       FROM users u
       JOIN roles r ON u.role_id = r.id
       JOIN branches b ON u.branch_id = b.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (users.length === 0) {
      return error(res, "User not found", 404);
    }

    const user = users[0];
    return success(res, {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      branch: user.branch,
      branchId: user.branch_id,
      status: user.status,
      lastLogin: user.last_login,
    });
  } catch (err) {
    next(err);
  }
}

export function logout(req, res) {
  return success(res, null, "Logged out successfully");
}

async function loginOrCreateOauthUser(res, { email, name, avatar, provider = "Google", role = null }) {
  // Check if user exists by email
  let users = await query(
    `SELECT u.id, u.name, u.username, u.email, u.phone, u.status,
            r.name AS role, b.name AS branch, b.id AS branch_id
     FROM users u
     JOIN roles r ON u.role_id = r.id
     JOIN branches b ON u.branch_id = b.id
     WHERE LOWER(u.email) = LOWER(?)`,
    [email]
  );

  let user;
  if (users.length > 0) {
    user = users[0];
    if (user.status !== "Active") {
      return error(res, "This Google-linked account has been deactivated. Contact your administrator.", 403);
    }
  } else {
    // Automatically register new user under Pharmacist or specified role
    const targetRole = role || "Pharmacist";
    const roles = await query("SELECT id FROM roles WHERE name = ? LIMIT 1", [targetRole]);
    const roleId = roles[0]?.id || 2;
    const branches = await query("SELECT id, name FROM branches LIMIT 1");
    const branchId = branches[0]?.id || "BR-01";
    const branchName = branches[0]?.name || "Kovilpatti Branch";
    const newId = `USR-G-${Date.now().toString().slice(-4)}`;
    const baseUsername = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "") || "guser";
    let username = baseUsername;
    const existingUser = await query("SELECT id FROM users WHERE username = ?", [username]);
    if (existingUser.length > 0) {
      username = `${baseUsername}_${Date.now().toString().slice(-4)}`;
    }

    await query(
      `INSERT INTO users (id, name, username, email, password_hash, phone, role_id, branch_id, status, last_login)
       VALUES (?, ?, ?, ?, 'GOOGLE_OAUTH_AUTHENTICATED', '+91 99999 00000', ?, ?, 'Active', NOW())`,
      [newId, name || "Google User", username, email, roleId, branchId]
    );

    user = {
      id: newId,
      name: name || "Google User",
      username,
      email,
      phone: "+91 99999 00000",
      role: targetRole,
      branch: branchName,
      branch_id: branchId,
      status: "Active",
    };
  }

  const now = new Date();
  const lastLoginFormatted =
    now.toISOString().slice(0, 10) +
    " " +
    now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  await query("UPDATE users SET last_login = ? WHERE id = ?", [lastLoginFormatted, user.id]);

  const payload = {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    branch: user.branch,
    branchId: user.branch_id || user.branchId,
    oauthProvider: provider,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

  return success(
    res,
    {
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        branch: user.branch,
        branchId: user.branch_id || user.branchId,
        status: user.status || "Active",
        oauthProvider: provider,
        avatar: avatar || null,
        lastLogin: lastLoginFormatted,
      },
    },
    `Signed in via ${provider} OAuth successfully`
  );
}

export async function oauthLogin(req, res, next) {
  try {
    const { provider = "Google", email, name, avatar, role = "Admin" } = req.body;
    if (!email) {
      return error(res, "OAuth email is required", 400);
    }
    return await loginOrCreateOauthUser(res, { email, name, avatar, provider, role });
  } catch (err) {
    next(err);
  }
}

/**
/**
 * GET /api/auth/google/config
 * Returns current Google OAuth configuration status
 */
export function getGoogleConfig(req, res) {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = process.env;
  const isConfigured = Boolean(
    GOOGLE_CLIENT_ID &&
    GOOGLE_CLIENT_ID.trim() &&
    GOOGLE_CLIENT_SECRET &&
    GOOGLE_CLIENT_SECRET.trim()
  );
  return success(res, {
    configured: isConfigured,
    clientId: GOOGLE_CLIENT_ID || null,
    callbackUrl: GOOGLE_CALLBACK_URL || "http://localhost:5173/auth/google/callback",
  });
}

/**
 * POST /api/auth/google/config
 * Updates runtime Google OAuth configuration in backend and persists to .env
 */
export function setGoogleConfig(req, res) {
  const { clientId, clientSecret, callbackUrl } = req.body || {};
  if (clientId) process.env.GOOGLE_CLIENT_ID = String(clientId).trim();
  if (clientSecret) process.env.GOOGLE_CLIENT_SECRET = String(clientSecret).trim();
  if (callbackUrl) process.env.GOOGLE_CALLBACK_URL = String(callbackUrl).trim();

  try {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, "utf-8");
      if (clientId) {
        if (/^GOOGLE_CLIENT_ID=/m.test(envContent)) {
          envContent = envContent.replace(/^GOOGLE_CLIENT_ID=.*$/m, `GOOGLE_CLIENT_ID=${String(clientId).trim()}`);
        } else {
          envContent += `\nGOOGLE_CLIENT_ID=${String(clientId).trim()}`;
        }
      }
      if (clientSecret) {
        if (/^GOOGLE_CLIENT_SECRET=/m.test(envContent)) {
          envContent = envContent.replace(/^GOOGLE_CLIENT_SECRET=.*$/m, `GOOGLE_CLIENT_SECRET=${String(clientSecret).trim()}`);
        } else {
          envContent += `\nGOOGLE_CLIENT_SECRET=${String(clientSecret).trim()}`;
        }
      }
      if (callbackUrl) {
        if (/^GOOGLE_CALLBACK_URL=/m.test(envContent)) {
          envContent = envContent.replace(/^GOOGLE_CALLBACK_URL=.*$/m, `GOOGLE_CALLBACK_URL=${String(callbackUrl).trim()}`);
        } else {
          envContent += `\nGOOGLE_CALLBACK_URL=${String(callbackUrl).trim()}`;
        }
      }
      fs.writeFileSync(envPath, envContent, "utf-8");
    }
  } catch (fsErr) {
    console.warn("Could not write to .env file:", fsErr.message);
  }

  const isConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_ID.trim() &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CLIENT_SECRET.trim()
  );

  return success(
    res,
    {
      configured: isConfigured,
      clientId: process.env.GOOGLE_CLIENT_ID,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5173/auth/google/callback",
    },
    "Google OAuth configuration updated"
  );
}

/**
 * GET /api/auth/google/url
 * Returns Google OAuth 2.0 authorization URL for real Google sign-in
 */
export function getGoogleAuthUrl(req, res) {
  const clientId = req.query?.clientId || process.env.GOOGLE_CLIENT_ID;
  const callback = req.query?.redirectUri || process.env.GOOGLE_CALLBACK_URL || "http://localhost:5173/auth/google/callback";

  if (!clientId || clientId.trim() === "") {
    return error(
      res,
      "Google OAuth not configured. Please provide or configure a valid Google Client ID.",
      400
    );
  }

  const scope = encodeURIComponent("openid email profile");
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    clientId.trim()
  )}&redirect_uri=${encodeURIComponent(callback)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;

  return success(res, { url, clientId: clientId.trim() }, "Google OAuth URL generated");
}

/**
 * POST /api/auth/google/callback
 * Exchanges authorization code for Google tokens and signs in user
 */
export async function handleGoogleCallback(req, res, next) {
  try {
    const code = req.body?.code || req.query?.code;
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = process.env;

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return error(
        res,
        "Google OAuth not configured. Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in backend/.env.",
        400
      );
    }

    if (!code) {
      return error(res, "Authorization code is required for Google OAuth callback", 400);
    }

    const callback = GOOGLE_CALLBACK_URL || "http://localhost:5173/auth/google/callback";
    const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: callback,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResp.json();
    if (!tokenResp.ok || !tokenData.access_token) {
      return error(
        res,
        `Google OAuth token exchange failed: ${tokenData.error_description || tokenData.error || "Invalid authorization code"}`,
        401
      );
    }

    // Retrieve user profile from Google OpenID userinfo
    const userResp = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await userResp.json();

    if (!profile.email) {
      return error(res, "Failed to retrieve verified email from Google OAuth profile", 400);
    }

    return await loginOrCreateOauthUser(res, {
      email: profile.email,
      name: profile.name || profile.given_name || profile.email.split("@")[0],
      avatar: profile.picture,
      provider: "Google",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/google/verify-token
 * Verifies Google ID token / Credential from Google Identity Services
 */
export async function verifyGoogleToken(req, res, next) {
  try {
    const { credential, idToken, accessToken } = req.body;
    const tokenToVerify = credential || idToken;

    if (!tokenToVerify && !accessToken) {
      return error(res, "Google credential or token is required for verification", 400);
    }

    let email, name, picture;

    if (tokenToVerify) {
      const verifyResp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${tokenToVerify}`);
      const payload = await verifyResp.json();
      if (!verifyResp.ok || !payload.email) {
        return error(res, `Invalid Google token: ${payload.error_description || "Verification failed"}`, 401);
      }
      email = payload.email;
      name = payload.name;
      picture = payload.picture;
    } else {
      const userResp = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profile = await userResp.json();
      if (!profile.email) {
        return error(res, "Failed to retrieve user profile from Google", 401);
      }
      email = profile.email;
      name = profile.name;
      picture = profile.picture;
    }

    return await loginOrCreateOauthUser(res, {
      email,
      name,
      avatar: picture,
      provider: "Google",
    });
  } catch (err) {
    next(err);
  }
}
