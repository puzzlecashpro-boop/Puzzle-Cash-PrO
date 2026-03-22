import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import {
  exchangeCodeForSessionToken,
  getOAuthRedirectUrl,
  authMiddleware,
  deleteSession,
  MOCHA_SESSION_TOKEN_COOKIE_NAME,
} from "@getmocha/users-service/backend";

const app = new Hono<{ Bindings: Env }>();

// ==================== AUTH ROUTES ====================

// Get OAuth redirect URL
app.get("/api/oauth/google/redirect_url", async (c) => {
  const redirectUrl = await getOAuthRedirectUrl("google", {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  return c.json({ redirectUrl }, 200);
});

// Exchange code for session token
app.post("/api/sessions", async (c) => {
  const body = await c.req.json();

  if (!body.code) {
    return c.json({ error: "No authorization code provided" }, 400);
  }

  const sessionToken = await exchangeCodeForSessionToken(body.code, {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 60 * 24 * 60 * 60, // 60 days
  });

  return c.json({ success: true }, 200);
});

// Get current user
app.get("/api/users/me", authMiddleware, async (c) => {
  const user = c.get("user");
  
  // Initialize user wallet if not exists (with signup bonus)
  const existingWallet = await c.env.DB.prepare(
    "SELECT * FROM user_wallets WHERE user_id = ?"
  ).bind(user!.id).first();

  if (!existingWallet) {
    // Create wallet with ₹50 signup bonus
    await c.env.DB.prepare(
      `INSERT INTO user_wallets (user_id, email, balance, practice_credits, has_claimed_signup_bonus, created_at, updated_at) 
       VALUES (?, ?, 50, 5, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    ).bind(user!.id, user!.email).run();

    // Log signup bonus transaction
    await c.env.DB.prepare(
      `INSERT INTO transactions (user_id, type, title, amount, is_credit, created_at, updated_at)
       VALUES (?, 'signup_bonus', 'Sign-up Bonus', 50, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    ).bind(user!.id).run();
  }

  return c.json(user);
});

// Logout
app.get("/api/logout", async (c) => {
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);

  if (typeof sessionToken === "string") {
    await deleteSession(sessionToken, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });
  }

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 0,
  });

  return c.json({ success: true }, 200);
});

// ==================== WALLET ROUTES ====================

// Get user wallet
app.get("/api/wallet", authMiddleware, async (c) => {
  const user = c.get("user");
  
  const wallet = await c.env.DB.prepare(
    "SELECT * FROM user_wallets WHERE user_id = ?"
  ).bind(user!.id).first();

  if (!wallet) {
    // Create wallet if not exists
    await c.env.DB.prepare(
      `INSERT INTO user_wallets (user_id, email, balance, practice_credits, created_at, updated_at) 
       VALUES (?, ?, 50, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    ).bind(user!.id, user!.email).run();

    return c.json({
      balance: 50,
      practiceCredits: 5,
      totalWins: 0,
      totalLosses: 0,
      hasClaimedSignupBonus: true,
    });
  }

  return c.json({
    balance: wallet.balance,
    practiceCredits: wallet.practice_credits,
    totalWins: wallet.total_wins,
    totalLosses: wallet.total_losses,
    hasClaimedSignupBonus: wallet.has_claimed_signup_bonus === 1,
    lastDailyBonusAt: wallet.last_daily_bonus_at,
  });
});

// Deposit to wallet
app.post("/api/wallet/deposit", authMiddleware, async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const amount = parseInt(body.amount);

  if (!amount || amount <= 0) {
    return c.json({ error: "Invalid amount" }, 400);
  }

  await c.env.DB.prepare(
    `UPDATE user_wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`
  ).bind(amount, user!.id).run();

  // Log deposit transaction
  await c.env.DB.prepare(
    `INSERT INTO transactions (user_id, type, title, amount, is_credit, created_at, updated_at)
     VALUES (?, 'deposit', 'Deposit', ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
  ).bind(user!.id, amount).run();

  const wallet = await c.env.DB.prepare(
    "SELECT balance FROM user_wallets WHERE user_id = ?"
  ).bind(user!.id).first();

  return c.json({ balance: wallet?.balance || 0 });
});

// Get transaction history
app.get("/api/wallet/transactions", authMiddleware, async (c) => {
  const user = c.get("user");
  
  const transactions = await c.env.DB.prepare(
    `SELECT id, type, title, amount, is_credit, created_at 
     FROM transactions 
     WHERE user_id = ? 
     ORDER BY created_at DESC 
     LIMIT 50`
  ).bind(user!.id).all();

  return c.json({ transactions: transactions.results || [] });
});

// Withdraw from wallet
app.post("/api/wallet/withdraw", authMiddleware, async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const amount = parseInt(body.amount);

  if (!amount || amount < 100) {
    return c.json({ error: "Minimum withdrawal is ₹100" }, 400);
  }

  const wallet = await c.env.DB.prepare(
    "SELECT balance FROM user_wallets WHERE user_id = ?"
  ).bind(user!.id).first();

  if (!wallet || (wallet.balance as number) < amount) {
    return c.json({ error: "Insufficient balance" }, 400);
  }

  await c.env.DB.prepare(
    `UPDATE user_wallets SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`
  ).bind(amount, user!.id).run();

  // Log withdrawal transaction
  await c.env.DB.prepare(
    `INSERT INTO transactions (user_id, type, title, amount, is_credit, created_at, updated_at)
     VALUES (?, 'withdrawal', 'Withdrawal', ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
  ).bind(user!.id, amount).run();

  const updatedWallet = await c.env.DB.prepare(
    "SELECT balance FROM user_wallets WHERE user_id = ?"
  ).bind(user!.id).first();

  return c.json({ balance: updatedWallet?.balance || 0 });
});

// Claim daily bonus
app.post("/api/wallet/daily-bonus", authMiddleware, async (c) => {
  const user = c.get("user");

  const wallet = await c.env.DB.prepare(
    "SELECT last_daily_bonus_at FROM user_wallets WHERE user_id = ?"
  ).bind(user!.id).first();

  // Check if already claimed today
  if (wallet?.last_daily_bonus_at) {
    const lastClaim = new Date(wallet.last_daily_bonus_at as string);
    const now = new Date();
    const hoursSinceLastClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLastClaim < 24) {
      return c.json({ error: "Daily bonus already claimed", canClaimIn: Math.ceil(24 - hoursSinceLastClaim) }, 400);
    }
  }

  await c.env.DB.prepare(
    `UPDATE user_wallets SET practice_credits = practice_credits + 3, last_daily_bonus_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`
  ).bind(user!.id).run();

  const updatedWallet = await c.env.DB.prepare(
    "SELECT practice_credits FROM user_wallets WHERE user_id = ?"
  ).bind(user!.id).first();

  return c.json({ practiceCredits: updatedWallet?.practice_credits || 0 });
});

// Deduct entry fee for battle
app.post("/api/wallet/deduct-entry", authMiddleware, async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const amount = parseInt(body.amount);
  const battleType = body.battleType || '1v1'; // '1v1' or 'tournament'
  const gameName = body.gameName || 'Game';

  if (!amount || amount <= 0) {
    return c.json({ error: "Invalid amount" }, 400);
  }

  const wallet = await c.env.DB.prepare(
    "SELECT balance FROM user_wallets WHERE user_id = ?"
  ).bind(user!.id).first();

  if (!wallet || (wallet.balance as number) < amount) {
    return c.json({ error: "Insufficient balance" }, 400);
  }

  await c.env.DB.prepare(
    `UPDATE user_wallets SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`
  ).bind(amount, user!.id).run();

  // Log paid battle entry transaction with details
  const title = battleType === 'tournament' 
    ? `Tournament Entry - ${gameName}` 
    : `1v1 Battle Entry - ${gameName}`;
  
  await c.env.DB.prepare(
    `INSERT INTO transactions (user_id, type, title, amount, is_credit, created_at, updated_at)
     VALUES (?, 'battle_entry', ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
  ).bind(user!.id, title, amount).run();

  return c.json({ success: true });
});

// Refund entry fee (for matchmaking timeout)
app.post("/api/wallet/refund-entry", authMiddleware, async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const amount = parseInt(body.amount);
  const battleType = body.battleType || '1v1';
  const gameName = body.gameName || 'Game';

  if (!amount || amount <= 0) {
    return c.json({ error: "Invalid amount" }, 400);
  }

  // Add amount back to wallet
  await c.env.DB.prepare(
    `UPDATE user_wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`
  ).bind(amount, user!.id).run();

  // Log refund transaction
  const title = battleType === 'tournament' 
    ? `Tournament Refund - ${gameName}` 
    : `1v1 Battle Refund - ${gameName}`;
  
  await c.env.DB.prepare(
    `INSERT INTO transactions (user_id, type, title, amount, is_credit, created_at, updated_at)
     VALUES (?, 'refund', ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
  ).bind(user!.id, title, amount).run();

  // Get updated balance
  const wallet = await c.env.DB.prepare(
    "SELECT balance FROM user_wallets WHERE user_id = ?"
  ).bind(user!.id).first();

  return c.json({ success: true, balance: wallet?.balance || 0 });
});

// Use practice credit
app.post("/api/wallet/use-credit", authMiddleware, async (c) => {
  const user = c.get("user");

  const wallet = await c.env.DB.prepare(
    "SELECT practice_credits FROM user_wallets WHERE user_id = ?"
  ).bind(user!.id).first();

  if (!wallet || (wallet.practice_credits as number) < 1) {
    return c.json({ error: "No practice credits" }, 400);
  }

  await c.env.DB.prepare(
    `UPDATE user_wallets SET practice_credits = practice_credits - 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`
  ).bind(user!.id).run();

  return c.json({ success: true });
});

// ==================== LEADERBOARD ROUTES ====================

// Get leaderboard (public - no auth required)
app.get("/api/leaderboard", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT email, total_wins 
     FROM user_wallets 
     WHERE total_wins > 0
     ORDER BY total_wins DESC 
     LIMIT 10`
  ).all();

  // Mask emails for privacy (e.g., praf***@gmail.com)
  const players = (results || []).map((row: any, index: number) => {
    const email = row.email as string;
    const atIndex = email.indexOf('@');
    const maskedEmail = atIndex > 3 
      ? email.substring(0, 3) + '***' + email.substring(atIndex)
      : email.substring(0, 1) + '***' + email.substring(atIndex);
    
    return {
      rank: index + 1,
      name: maskedEmail,
      gamesWon: row.total_wins as number,
    };
  });

  // Fill remaining spots with dummy data if less than 10 players
  const dummyPlayers = [
    { name: 'pro***@gmail.com', gamesWon: 47 },
    { name: 'gam***@yahoo.com', gamesWon: 42 },
    { name: 'puz***@outlook.com', gamesWon: 38 },
    { name: 'cha***@gmail.com', gamesWon: 35 },
    { name: 'mas***@hotmail.com', gamesWon: 31 },
    { name: 'wiz***@gmail.com', gamesWon: 28 },
    { name: 'ace***@yahoo.com', gamesWon: 24 },
    { name: 'kin***@gmail.com', gamesWon: 21 },
    { name: 'sta***@outlook.com', gamesWon: 18 },
    { name: 'leg***@gmail.com', gamesWon: 15 },
  ];

  while (players.length < 10) {
    const dummyIndex = players.length;
    const dummy = dummyPlayers[dummyIndex];
    players.push({
      rank: players.length + 1,
      name: dummy.name,
      gamesWon: dummy.gamesWon,
    });
  }

  return c.json({ players });
});

// ==================== GAME HISTORY ROUTES ====================

// Record game result
app.post("/api/games/record", authMiddleware, async (c) => {
  const user = c.get("user");
  const body = await c.req.json();

  const { gameId, gameMode, entryFee, prizeWon, score, timeTaken, isWin, battleType, gameName, tournamentRank } = body;

  // Record game
  await c.env.DB.prepare(
    `INSERT INTO game_history (user_id, game_id, game_mode, entry_fee, prize_won, score, time_taken, is_win, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
  ).bind(user!.id, gameId, gameMode, entryFee || 0, prizeWon || 0, score || 0, timeTaken || 0, isWin ? 1 : 0).run();

  // Update user stats
  if (isWin) {
    await c.env.DB.prepare(
      `UPDATE user_wallets SET total_wins = total_wins + 1, balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`
    ).bind(prizeWon || 0, user!.id).run();

    // Log victory transaction if prize won with descriptive title
    if (prizeWon > 0) {
      let title = 'Victory Winnings';
      const displayName = gameName || gameId || 'Game';
      
      if (gameMode === 'battle') {
        if (battleType === 'tournament') {
          title = `Tournament Win #${tournamentRank || 1} - ${displayName}`;
        } else {
          title = `1v1 Victory - ${displayName}`;
        }
      }
      
      await c.env.DB.prepare(
        `INSERT INTO transactions (user_id, type, title, amount, is_credit, created_at, updated_at)
         VALUES (?, 'victory', ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      ).bind(user!.id, title, prizeWon).run();
    }
  } else {
    await c.env.DB.prepare(
      `UPDATE user_wallets SET total_losses = total_losses + 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`
    ).bind(user!.id).run();
  }

  // Get updated wallet
  const wallet = await c.env.DB.prepare(
    "SELECT balance, total_wins, total_losses FROM user_wallets WHERE user_id = ?"
  ).bind(user!.id).first();

  return c.json({
    balance: wallet?.balance || 0,
    totalWins: wallet?.total_wins || 0,
    totalLosses: wallet?.total_losses || 0,
  });
});

// Get game history
app.get("/api/games/history", authMiddleware, async (c) => {
  const user = c.get("user");

  const { results } = await c.env.DB.prepare(
    "SELECT * FROM game_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50"
  ).bind(user!.id).all();

  return c.json(results);
});

// ==================== DEPOSIT/WITHDRAWAL REQUEST ROUTES ====================

// Submit deposit request
app.post("/api/wallet/deposit-request", authMiddleware, async (c) => {
  const user = c.get("user");
  
  if (!user || !user.id) {
    return c.json({ success: false, error: "AUTH_ERROR: No authenticated user found" }, 401);
  }
  
  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    return c.json({ success: false, error: "PARSE_ERROR: Invalid JSON body" }, 400);
  }
  
  const { amount, upiRef } = body;

  if (!amount || amount <= 0) {
    return c.json({ success: false, error: "VALIDATION_ERROR: Amount must be greater than 0" }, 400);
  }

  if (!upiRef || upiRef.trim() === '') {
    return c.json({ success: false, error: "VALIDATION_ERROR: UTR/Reference is required" }, 400);
  }

  try {
    const result = await c.env.DB.prepare(
      `INSERT INTO deposit_requests (user_id, email, amount, upi_ref, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    ).bind(user.id, user.email || '', amount, upiRef.trim()).run();

    if (result.success) {
      return c.json({ success: true, message: "Deposit request saved to database", id: result.meta?.last_row_id });
    } else {
      return c.json({ success: false, error: "DB_WRITE_ERROR: Insert returned success=false" }, 500);
    }
  } catch (dbError: any) {
    const errorMsg = dbError?.message || dbError?.toString() || "Unknown database error";
    return c.json({ success: false, error: `DB_ERROR: ${errorMsg}` }, 500);
  }
});

// Submit withdrawal request (modified to create request instead of instant withdrawal)
app.post("/api/wallet/withdraw-request", authMiddleware, async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const { amount, upiId } = body;

  if (!amount || amount < 100) {
    return c.json({ error: "Minimum withdrawal is ₹100" }, 400);
  }

  const wallet = await c.env.DB.prepare(
    "SELECT balance FROM user_wallets WHERE user_id = ?"
  ).bind(user!.id).first();

  if (!wallet || (wallet.balance as number) < amount) {
    return c.json({ error: "Insufficient balance" }, 400);
  }

  // Deduct balance immediately (will be refunded if rejected)
  await c.env.DB.prepare(
    `UPDATE user_wallets SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`
  ).bind(amount, user!.id).run();

  // Create withdrawal request
  await c.env.DB.prepare(
    `INSERT INTO withdrawal_requests (user_id, email, amount, upi_id, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
  ).bind(user!.id, user!.email, amount, upiId || '').run();

  const updatedWallet = await c.env.DB.prepare(
    "SELECT balance FROM user_wallets WHERE user_id = ?"
  ).bind(user!.id).first();

  return c.json({ success: true, balance: updatedWallet?.balance || 0 });
});

// ==================== ADMIN ROUTES ====================

// Get pending deposits
app.get("/api/admin/pending-deposits", async (c) => {
  try {
    const queryResult = await c.env.DB.prepare(
      `SELECT id, user_id, email, amount, upi_ref, status, created_at 
       FROM deposit_requests 
       WHERE status = 'pending' 
       ORDER BY created_at DESC`
    ).all();

    console.log("Admin pending deposits query result:", queryResult);

    const deposits = queryResult.results || [];
    return c.json({ deposits });
  } catch (error) {
    console.error("Error fetching pending deposits:", error);
    return c.json({ deposits: [], error: "Failed to fetch deposits" }, 500);
  }
});

// Get pending withdrawals
app.get("/api/admin/pending-withdrawals", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT id, user_id, email, amount, upi_id, status, created_at 
     FROM withdrawal_requests 
     WHERE status = 'pending' 
     ORDER BY created_at DESC`
  ).all();

  return c.json({ withdrawals: results || [] });
});

// Approve deposit
app.post("/api/admin/deposits/:id/approve", async (c) => {
  const id = c.req.param("id");

  const deposit = await c.env.DB.prepare(
    "SELECT * FROM deposit_requests WHERE id = ? AND status = 'pending'"
  ).bind(id).first();

  if (!deposit) {
    return c.json({ error: "Deposit request not found or already processed" }, 404);
  }

  // Add amount to user wallet
  await c.env.DB.prepare(
    `UPDATE user_wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`
  ).bind(deposit.amount, deposit.user_id).run();

  // Log transaction
  await c.env.DB.prepare(
    `INSERT INTO transactions (user_id, type, title, amount, is_credit, created_at, updated_at)
     VALUES (?, 'deposit', 'Deposit Approved', ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
  ).bind(deposit.user_id, deposit.amount).run();

  // Update deposit status
  await c.env.DB.prepare(
    `UPDATE deposit_requests SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(id).run();

  // Check if this user was referred and this is their first deposit
  // If so, credit ₹5 to the referrer
  const referral = await c.env.DB.prepare(
    `SELECT * FROM referrals WHERE referred_user_id = ? AND bonus_credited = 0`
  ).bind(deposit.user_id).first();

  if (referral) {
    // Check if this is the user's first completed deposit
    const previousDeposits = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM deposit_requests 
       WHERE user_id = ? AND status = 'completed' AND id != ?`
    ).bind(deposit.user_id, id).first();

    if (!previousDeposits || (previousDeposits.count as number) === 0) {
      // This is their first deposit - credit referrer ₹5
      const bonusAmount = referral.bonus_amount || 5;
      
      await c.env.DB.prepare(
        `UPDATE user_wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`
      ).bind(bonusAmount, referral.referrer_user_id).run();

      // Log referral bonus transaction for referrer
      await c.env.DB.prepare(
        `INSERT INTO transactions (user_id, type, title, amount, is_credit, created_at, updated_at)
         VALUES (?, 'referral_bonus', 'Referral Bonus', ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      ).bind(referral.referrer_user_id, bonusAmount).run();

      // Mark referral bonus as credited
      await c.env.DB.prepare(
        `UPDATE referrals SET bonus_credited = 1, credited_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      ).bind(referral.id).run();
    }
  }

  return c.json({ success: true });
});

// Reject deposit
app.post("/api/admin/deposits/:id/reject", async (c) => {
  const id = c.req.param("id");

  const deposit = await c.env.DB.prepare(
    "SELECT * FROM deposit_requests WHERE id = ? AND status = 'pending'"
  ).bind(id).first();

  if (!deposit) {
    return c.json({ error: "Deposit request not found or already processed" }, 404);
  }

  // Update deposit status to rejected
  await c.env.DB.prepare(
    `UPDATE deposit_requests SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(id).run();

  return c.json({ success: true });
});

// Approve withdrawal (with Payout UTR)
app.post("/api/admin/withdrawals/:id/approve", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const payoutUtr = body.payoutUtr || '';

  if (!payoutUtr || payoutUtr.trim().length < 6) {
    return c.json({ error: "Payout UTR is required (minimum 6 characters)" }, 400);
  }

  const withdrawal = await c.env.DB.prepare(
    "SELECT * FROM withdrawal_requests WHERE id = ? AND status = 'pending'"
  ).bind(id).first();

  if (!withdrawal) {
    return c.json({ error: "Withdrawal request not found or already processed" }, 404);
  }

  // Update withdrawal status with UTR (balance was already deducted at request time)
  await c.env.DB.prepare(
    `UPDATE withdrawal_requests SET status = 'approved', payout_utr = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(payoutUtr.trim(), id).run();

  // Log transaction
  await c.env.DB.prepare(
    `INSERT INTO transactions (user_id, type, title, amount, is_credit, created_at, updated_at)
     VALUES (?, 'withdrawal', 'Withdrawal Completed', ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
  ).bind(withdrawal.user_id, withdrawal.amount).run();

  return c.json({ success: true });
});

// Reject withdrawal (refund amount)
app.post("/api/admin/withdrawals/:id/reject", async (c) => {
  const id = c.req.param("id");

  const withdrawal = await c.env.DB.prepare(
    "SELECT * FROM withdrawal_requests WHERE id = ? AND status = 'pending'"
  ).bind(id).first();

  if (!withdrawal) {
    return c.json({ error: "Withdrawal request not found or already processed" }, 404);
  }

  // Refund amount to user wallet
  await c.env.DB.prepare(
    `UPDATE user_wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`
  ).bind(withdrawal.amount, withdrawal.user_id).run();

  // Log refund transaction
  await c.env.DB.prepare(
    `INSERT INTO transactions (user_id, type, title, amount, is_credit, created_at, updated_at)
     VALUES (?, 'refund', 'Withdrawal Rejected - Refunded', ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
  ).bind(withdrawal.user_id, withdrawal.amount).run();

  // Update withdrawal status to rejected
  await c.env.DB.prepare(
    `UPDATE withdrawal_requests SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(id).run();

  return c.json({ success: true });
});

// Get user withdrawal history
app.get("/api/wallet/withdrawal-history", authMiddleware, async (c) => {
  const user = c.get("user");
  
  const { results } = await c.env.DB.prepare(
    `SELECT id, amount, upi_id, status, payout_utr, created_at, updated_at 
     FROM withdrawal_requests 
     WHERE user_id = ? 
     ORDER BY created_at DESC 
     LIMIT 50`
  ).bind(user!.id).all();

  return c.json({ withdrawals: results || [] });
});

// ==================== REFERRAL ROUTES ====================

// Apply referral code (called when user signs up with a referral code)
app.post("/api/referrals/apply", authMiddleware, async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const { referralCode } = body;

  if (!referralCode || referralCode.trim() === '') {
    return c.json({ error: "Referral code is required" }, 400);
  }

  // Check if user already has a referral record (already used a code)
  const existingReferral = await c.env.DB.prepare(
    `SELECT * FROM referrals WHERE referred_user_id = ?`
  ).bind(user!.id).first();

  if (existingReferral) {
    return c.json({ error: "You have already used a referral code" }, 400);
  }

  // Find referrer by code (code format: PC + first 6 chars of user_id)
  // Extract the user ID part from the code
  const codePrefix = referralCode.substring(0, 2).toUpperCase();
  const codeBody = referralCode.substring(2).toUpperCase();

  if (codePrefix !== 'PC' || codeBody.length < 4) {
    return c.json({ error: "Invalid referral code format" }, 400);
  }

  // Find user whose ID starts with these characters
  const referrer = await c.env.DB.prepare(
    `SELECT user_id, email FROM user_wallets WHERE UPPER(REPLACE(user_id, '-', '')) LIKE ?`
  ).bind(codeBody + '%').first();

  if (!referrer) {
    return c.json({ error: "Referral code not found" }, 404);
  }

  // Can't refer yourself
  if (referrer.user_id === user!.id) {
    return c.json({ error: "You cannot use your own referral code" }, 400);
  }

  // Create referral record
  await c.env.DB.prepare(
    `INSERT INTO referrals (referrer_user_id, referrer_email, referred_user_id, referred_email, referral_code, bonus_amount, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
  ).bind(referrer.user_id, referrer.email || '', user!.id, user!.email || '', referralCode.toUpperCase()).run();

  return c.json({ success: true, message: "Referral code applied! Referrer will receive ₹5 after your first deposit." });
});

// Get admin referral logs
app.get("/api/admin/referrals", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT id, referrer_email, referred_email, referral_code, bonus_credited, bonus_amount, credited_at, created_at 
     FROM referrals 
     ORDER BY created_at DESC 
     LIMIT 100`
  ).all();

  return c.json({ referrals: results || [] });
});

export default app;
