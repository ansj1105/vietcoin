// 📁 routes/token.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const { v4: uuidv4 } = require('uuid');

// 🔐 관리자 권한 검증 미들웨어 필요 시 추가 가능

// -------------------
// 3.1 토큰 관리 (관리자용)
// -------------------
router.post("/tokens", async (req, res) => {
  const { name, symbol, description, totalSupply, decimals = 18 } = req.body;
  try {
    const id = uuidv4();
    await db.query(
      "INSERT INTO tokens (id, name, symbol, description, total_supply, decimals) VALUES (?, ?, ?, ?, ?, ?)",
      [id, name, symbol, description, totalSupply, decimals]
    );
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: "토큰 생성 실패", details: err.message });
  }
});

router.get("/tokens", async (_, res) => {
  const [tokens] = await db.query("SELECT * FROM tokens");
  res.json(tokens);
});

router.get("/tokens/:id", async (req, res) => {
  const [token] = await db.query("SELECT * FROM tokens WHERE id = ?", [req.params.id]);
  res.json(token[0]);
});

router.patch("/tokens/:id", async (req, res) => {
  const { name, symbol, description } = req.body;
  await db.query(
    "UPDATE tokens SET name = ?, symbol = ?, description = ? WHERE id = ?",
    [name, symbol, description, req.params.id]
  );
  res.json({ success: true });
});

router.delete("/tokens/:id", async (req, res) => {
  await db.query("DELETE FROM tokens WHERE id = ?", [req.params.id]);
  res.json({ success: true });
});
// 1) 전체 목록 조회
// GET /api/admin/token-sales
router.get('/token-sales', async (_req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        ts.id, ts.token_id, ts.name, ts.total_supply, ts.remaining_supply,
        ts.price, ts.fee_rate, ts.start_time, ts.end_time, ts.is_active,
        ts.minimum_purchase, ts.maximum_purchase, ts.lockup_period,
        ts.created_at, ts.updated_at,
        t.symbol as token_symbol
      FROM token_sales ts
      LEFT JOIN tokens t ON ts.token_id = t.id
      ORDER BY ts.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('❌ token-sales list error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch token sales' });
  }
});

// ▶ 2) 신규 등록 (circulating_supply 동기화 추가)
router.post('/token-sales', async (req, res) => {
  const {
    token_id, name, total_supply,
    price, fee_rate, start_time, end_time,
    is_active, minimum_purchase,
    maximum_purchase, lockup_period
  } = req.body;

  // 필수값 검사
  if (!token_id || !name || total_supply == null || price == null) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const id = uuidv4();
  const supply = Number(total_supply);

  try {
    // 1) token_sales 에 삽입
    await db.query(
      `INSERT INTO token_sales
         (id, token_id, name, total_supply, remaining_supply,
          price, fee_rate, start_time, end_time, is_active,
          minimum_purchase, maximum_purchase, lockup_period, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        id, token_id, name, supply, supply,
        price, fee_rate || 0, start_time || null, end_time || null, is_active ? 1 : 0,
        minimum_purchase || 0, maximum_purchase || null, lockup_period || 0
      ]
    );

    // 2) tokens 테이블에서 현재 circulating_supply, total_supply 읽기
    const [[tok]] = await db.query(
      `SELECT total_supply, circulating_supply
         FROM tokens
        WHERE id = ?`,
      [token_id]
    );
    if (!tok) {
      // 롤백을 원하면 token_sales 삭제 처리할 수 있습니다.
      console.warn(`Referenced token ${token_id} not found`);
    } else {
      // 3) 새로운 circulating 계산 & 캡핑
      let newCirc = Number(tok.circulating_supply) + supply;
      if (newCirc > Number(tok.total_supply)) {
        newCirc = Number(tok.total_supply);
      }
      // 4) tokens 테이블 업데이트
      await db.query(
        `UPDATE tokens
            SET circulating_supply = ?,
                updated_at         = NOW()
          WHERE id = ?`,
        [newCirc, token_id]
      );
    }

    res.json({ success: true, data: { id } });
  } catch (err) {
    console.error('❌ token-sales create error:', err);
    res.status(500).json({ success: false, error: 'Failed to create token sale' });
  }
});

// ▶ 3) 기존 수정 (total_supply 변경 시 tokens.circulating_supply 동기화)
router.put('/token-sales/:id', async (req, res) => {
  const { id } = req.params;
  const {
    token_id, name, total_supply,
    price, fee_rate, start_time, end_time,
    is_active, minimum_purchase,
    maximum_purchase, lockup_period
  } = req.body;

  try {
    // 1) 기존 token_sale 불러오기
    const [[sale]] = await db.query(
      `SELECT token_id, total_supply
         FROM token_sales
        WHERE id = ?`,
      [id]
    );
    if (!sale) {
      return res.status(404).json({ success: false, error: 'Token sale not found' });
    }

    const oldTotal = Number(sale.total_supply);
    const newTotal = total_supply != null ? Number(total_supply) : oldTotal;
    const diff = newTotal - oldTotal;

    // 2) token_sales 업데이트
    await db.query(
      `UPDATE token_sales
         SET name            = ?,
             total_supply    = ?,
             price           = ?,
             fee_rate        = ?,
             start_time      = ?,
             end_time        = ?,
             is_active       = ?,
             minimum_purchase= ?,
             maximum_purchase= ?,
             lockup_period   = ?,
             updated_at      = NOW()
       WHERE id = ?`,
      [
        name,
        newTotal,
        price,
        fee_rate || 0,
        start_time || null,
        end_time || null,
        is_active ? 1 : 0,
        minimum_purchase || 0,
        maximum_purchase || null,
        lockup_period || 0,
        id
      ]
    );

    // 3) diff가 0이 아니면 tokens.circulating_supply 보정
    if (diff !== 0) {
      // 3-1) tokens 현재 값 읽기
      const [[tok]] = await db.query(
        `SELECT total_supply, circulating_supply
           FROM tokens
          WHERE id = ?`,
        [sale.token_id]
      );
      if (!tok) {
        return res.status(400).json({ success: false, error: 'Referenced token not found' });
      }

      // 3-2) 새로운 circulating 계산 & 캡핑
      let newCirc = Number(tok.circulating_supply) + diff;
      if (newCirc > Number(tok.total_supply)) {
        newCirc = Number(tok.total_supply);
      }
      if (newCirc < 0) {
        newCirc = 0;
      }

      // 3-3) tokens 테이블 업데이트
      await db.query(
        `UPDATE tokens
            SET circulating_supply = ?,
                updated_at         = NOW()
          WHERE id = ?`,
        [newCirc, sale.token_id]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('❌ token-sales update error:', err);
    res.status(500).json({ success: false, error: 'Failed to update token sale' });
  }
});

// 4) 판매 삭제
// DELETE /api/admin/token-sales/:id
router.delete('/token-sales/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // 존재 확인
    const [[existing]] = await db.query(
      `SELECT id FROM token_sales WHERE id = ?`,
      [id]
    );
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Token sale not found' });
    }

    // 실제 삭제
    await db.query(
      `DELETE FROM token_sales WHERE id = ?`,
      [id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('❌ token-sales delete error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete token sale' });
  }
});
// ------------------------
// 3.3 사용자 토큰 관리
// ------------------------
router.get("/users/:userId/token-wallet", async (req, res) => {
  const [wallet] = await db.query("SELECT * FROM token_wallets WHERE user_id = ?", [req.params.userId]);
  res.json(wallet[0]);
});

router.get("/users/:userId/token-transactions", async (req, res) => {
  const [txs] = await db.query("SELECT * FROM token_transactions WHERE wallet_id = (SELECT id FROM token_wallets WHERE user_id = ?) ORDER BY created_at DESC", [req.params.userId]);
  res.json(txs);
});

router.post("/token-deposit", async (req, res) => {
  const userId = req.session.user?.id;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  const { amount } = req.body;



  const [[wallet]] = await db.query("SELECT id FROM token_wallets WHERE user_id = ?", [userId]);
  const txId = uuidv4();
  await db.query("UPDATE token_wallets SET balance = balance + ? WHERE user_id = ?", [amount, userId]);
  await db.query("INSERT INTO token_transactions (id, wallet_id, amount, type, status) VALUES (?, ?, ?, 'DEPOSIT', 'COMPLETED')", [txId, wallet.id, amount]);
  res.json({ success: true });
});

router.post("/token-withdrawal", async (req, res) => {
  const userId = req.session.user?.id;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  const { amount } = req.body;

  const [[wallet]] = await db.query("SELECT id, balance FROM token_wallets WHERE user_id = ?", [userId]);
  if (wallet.balance < amount) return res.status(400).json({ error: "잔액 부족" });
  const txId = uuidv4();
  await db.query("UPDATE token_wallets SET balance = balance - ? WHERE user_id = ?", [amount, userId]);
  await db.query("INSERT INTO token_transactions (id, wallet_id, amount, type, status) VALUES (?, ?, ?, 'WITHDRAWAL', 'COMPLETED')", [txId, wallet.id, amount]);
  res.json({ success: true });
});

// ------------------------
// 3.4 토큰 구매 및 판매
// ------------------------
router.get("/active-token-sales", async (_, res) => {
  const [rows] = await db.query("SELECT * FROM token_sales ORDER BY start_time ASC");
  res.json(rows);
});
// 📁 routes/token.js (or wherever you keep your token APIs)


// ------------------------
// 3.4 토큰 구매 및 판매
// ------------------------
// 📁 routes/token.js

// 3.4 토큰 구매 및 판매
router.post("/purchase-token", async (req, res) => {
  const userId = req.session.user?.id;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { saleId, amount } = req.body;
  let purchaseId;

  try {
    // 1) load sale
    const [[sale]] = await db.query(
      `SELECT * FROM token_sales
         WHERE id = ? AND is_active = 1`,
      [saleId]
    );
    if (!sale) throw new Error("NO_SALE");

    // 2) enforce min/max/available
    if (amount < sale.minimum_purchase) throw new Error("BELOW_MIN");
    if (sale.maximum_purchase && amount > sale.maximum_purchase) throw new Error("ABOVE_MAX");
    if (sale.remaining_supply < amount) throw new Error("NO_SUPPLY");

    // 3) load user wallet
    const [[wallet]] = await db.query(
      `SELECT * FROM wallets WHERE user_id = ?`,
      [userId]
    );
    if (!wallet) throw new Error("NO_WALLET");

    // 4) price check
    const totalPrice = +(amount * sale.price).toFixed(6);
    if (wallet.quant_balance < totalPrice) throw new Error("INSUFFICIENT_FUNDS");

    // 5) generate purchaseId via MySQL UUID()
    const [[{ id: genId }]] = await db.query(`SELECT UUID() AS id`);
    purchaseId = genId;

    // 6) record purchase with status PENDING
    const lockupUntil = sale.lockup_period
      ? new Date(Date.now() + sale.lockup_period * 86400000)
      : null;

    await db.query(
      `INSERT INTO token_purchases
         (id, user_id, token_id, sale_id, amount, price, total_price,
          status, lockup_until, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, NOW())`,
      [purchaseId, userId, sale.token_id, sale.id, amount, sale.price, totalPrice, lockupUntil]
    );

    // 7) update token_wallets balance & locked_amount
    await db.query(
      `UPDATE token_wallets
         SET balance       = balance + ?,
             locked_amount = locked_amount + ?
       WHERE user_id = ?`,
      [amount, lockupUntil ? amount : 0, userId]
    );

    // 8) insert into token_lockups for granular 락업 관리
    if (lockupUntil) {
      await db.query(
        `INSERT INTO token_lockups
           (id, wallet_id, amount, unlock_at)
         VALUES (UUID(), (SELECT id FROM token_wallets WHERE user_id=?), ?, ?)`,
        [userId, amount, lockupUntil]
      );
    }

    // 9) update token_sales & tokens
    await Promise.all([
      db.query(
        `UPDATE token_sales
           SET remaining_supply = remaining_supply - ?
         WHERE id = ?`,
        [amount, sale.id]
      ),
      db.query(
        `UPDATE tokens
           SET circulating_supply = circulating_supply + ?
         WHERE id = ?`,
        [amount, sale.token_id]
      )
    ]);

    // 10) deduct USDT from user wallet
    const newQuantBal = +(wallet.quant_balance - totalPrice).toFixed(6);
    await db.query(
      `UPDATE wallets
         SET quant_balance = ?, updated_at = NOW()
       WHERE user_id = ?`,
      [newQuantBal, userId]
    );

    // 11) finalize purchase
    await db.query(
      `UPDATE token_purchases
         SET status = 'COMPLETED', updated_at = NOW()
       WHERE id = ?`,
      [purchaseId]
    );

    // 12) log in wallets_log
    await db.query(
      `INSERT INTO wallets_log
         (user_id, category, log_date, direction, amount, balance_after,
          reference_type, reference_id, description, created_at)
       VALUES (?, 'quant', NOW(), 'out', ?, ?, 'token_purchase', ?, ?, NOW())`,
      [userId, totalPrice, newQuantBal, purchaseId, `Purchased ${amount} ${sale.name}`]
    );

    return res.json({ success: true, purchaseId });
  } catch (err) {
    // 실패 시 token_purchases는 PENDING 상태로 남고,
    // token_lockups 도 롤백 되지 않으므로, 필요하다면 수동 삭제하거나
    // 상태 필드를 이용해 expired 처리 하실 수 있습니다.
    console.error("❌ purchase-token error:", err);
    switch (err.message) {
      case "NO_SALE":
      case "BELOW_MIN":
      case "ABOVE_MAX":
      case "NO_SUPPLY":
      case "NO_WALLET":
      case "INSUFFICIENT_FUNDS":
        return res.status(400).json({ error: err.message });
      default:
        return res.status(500).json({ error: "Internal server error" });
    }
  }
});


router.get("/users/:userId/token-purchases", async (req, res) => {
  const [rows] = await db.query("SELECT * FROM token_purchases WHERE user_id = ? ORDER BY created_at DESC", [req.params.userId]);
  res.json(rows);
});

// ▶ 특정 주문 상세 조회
// GET /api/token-purchases/:purchaseId
router.get('/token-purchases/:purchaseId', async (req, res) => {
  const purchaseId = req.params.purchaseId;
  try {
    const [rows] = await db.query(
      `SELECT
         id,
         user_id,
         token_id,
         sale_id,
         amount,
         price,
         total_price,
         status,
         lockup_until,
         created_at,
         updated_at
       FROM token_purchases
       WHERE id = ?`,
      [purchaseId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: '해당 주문을 찾을 수 없습니다.' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('❌ 주문 상세 조회 오류:', err);
    res.status(500).json({ success: false, error: '서버 오류로 조회에 실패했습니다.' });
  }
});

// ▶ 전체 주문 목록 조회
// GET /api/token-purchases
router.get('/token-purchases', async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
         tp.id,
         tp.user_id,
         tp.token_id,
         tp.sale_id,
         tp.amount,
         tp.price,
         tp.total_price as total_amount,
         tp.status,
         tp.lockup_until,
         tp.created_at,
         tp.updated_at,
         u.email as user_email,
         t.symbol as token_symbol
       FROM token_purchases tp
       LEFT JOIN users u ON tp.user_id = u.id
       LEFT JOIN tokens t ON tp.token_id = t.id
       ORDER BY tp.created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('❌ 전체 주문 조회 오류:', err);
    res.status(500).json({ success: false, error: '서버 오류로 조회에 실패했습니다.' });
  }
});

// ▶ 내 토큰 지갑 전체 조회
// GET /api/token/my/wallet-details
router.get("/my/wallet-details", async (req, res) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    // 1) token_wallets에서 내 지갑 조회
    const [[wallet]] = await db.query(
      `SELECT id, user_id, balance, locked_amount, created_at, updated_at
         FROM token_wallets
        WHERE user_id = ?`,
      [userId]
    );
    if (!wallet) {
      return res.status(404).json({ success: false, error: "Token wallet not found" });
    }

    // 2) token_lockups에서 이 지갑의 모든 락업 내역 조회
    const [lockups] = await db.query(
      `SELECT id, wallet_id, amount, unlock_at, created_at
         FROM token_lockups
        WHERE wallet_id = ?
        ORDER BY unlock_at ASC`,
      [wallet.id]
    );

    // 3) 응답
    return res.json({
      success: true,
      data: {
        wallet,
        lockups
      }
    });
  } catch (err) {
    console.error("❌ /my/wallet-details error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});


// ▶ 내 주문 목록 조회
// GET /api/my/token-purchases
router.get('/my/token-purchases', async (req, res) => {
  const userId = req.session.user?.id;
  if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });

  try {
    const [rows] = await db.query(
      `SELECT
         id,
         token_id,
         sale_id,
         amount,
         price,
         total_price,
         status,
         lockup_until,
         created_at,
         updated_at
       FROM token_purchases
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('❌ 내 주문 목록 조회 오류:', err);
    res.status(500).json({ success: false, error: '서버 오류로 조회에 실패했습니다.' });
  }
});


// ▶ 내 만료된 락업 언락 처리 (트랜잭션 없이 db.query만 사용)
router.post("/my/unlock-expired-lockups", async (req, res, next) => {
  const userId = req.session.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }

  try {
    // 1) 내 지갑 ID 목록 조회
    const [walletRows] = await db.query(
      `SELECT id
         FROM token_wallets
        WHERE user_id = ?`,
      [userId]
    );
    const walletIds = walletRows.map(r => r.id);
    if (walletIds.length === 0) {
      return res.json({ success: true, unlockedWallets: 0 });
    }

    // 2) 만료된 락업별 해제량 집계 (내 지갑 한정)
    const [lockups] = await db.query(
      `SELECT wallet_id, SUM(amount) AS total_unlock
         FROM token_lockups
        WHERE unlock_at <= NOW()
          AND wallet_id IN (?)
        GROUP BY wallet_id`,
      [walletIds]
    );

    let unlockedCount = 0;
    if (lockups.length) {
      // 3) 각 지갑의 locked_amount 차감
      for (const { wallet_id, total_unlock } of lockups) {
        const [updateResult] = await db.query(
          `UPDATE token_wallets
              SET locked_amount = GREATEST(locked_amount - ?, 0),
                  updated_at    = NOW()
            WHERE id = ?`,
          [total_unlock, wallet_id]
        );
        if (updateResult.affectedRows) unlockedCount++;
      }

      // 4) 처리된 내 락업 레코드만 삭제
      /* await db.query(
         `DELETE FROM token_lockups
           WHERE unlock_at <= NOW()
             AND wallet_id IN (?)`,
         [walletIds]
       );*/
    }

    return res.json({ success: true, unlockedWallets: unlockedCount });
  } catch (err) {
    console.error("❌ 내 락업 언락 오류:", err);
    return next(err);
  }
});


// ▶ 내 토큰 → 정량(qu﻿ant) 교환 API
// POST /api/my/exchange-token-to-quant
// body: { tokenAmount: number }
router.post("/my/exchange-token-to-quant", async (req, res, next) => {
  const userId = req.session.user?.id;
  const { tokenAmount } = req.body;

  if (!userId) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }
  if (typeof tokenAmount !== "number" || tokenAmount <= 0) {
    return res.status(400).json({ success: false, error: "tokenAmount must be a positive number" });
  }

  try {
    // 1) 내 토큰 지갑 조회
    const [twRows] = await db.query(
      `SELECT id, balance, locked_amount
         FROM token_wallets
        WHERE user_id = ?`,
      [userId]
    );
    const tokenWallet = twRows[0];
    if (!tokenWallet) {
      return res.status(404).json({ success: false, error: "Token wallet not found" });
    }
    const available = tokenWallet.balance - tokenWallet.locked_amount;
    if (tokenAmount > available) {
      return res.status(400).json({
        success: false,
        error: `Insufficient available tokens. You have ${available}`
      });
    }

    // 2) 환율(settings) 조회
    const [setRows] = await db.query(
      `SELECT token_to_quant_rate
         FROM wallet_settings
        ORDER BY id DESC
        LIMIT 1`
    );
    const settings = setRows[0];
    if (!settings) {
      return res.status(500).json({ success: false, error: "Exchange settings not found" });
    }

    // 3) 내 일반 지갑 조회
    const [wRows] = await db.query(
      `SELECT id, quant_balance
         FROM wallets
        WHERE user_id = ?`,
      [userId]
    );
    const wallet = wRows[0];
    if (!wallet) {
      return res.status(404).json({ success: false, error: "Main wallet not found" });
    }

    // 4) 교환량 계산
    const rate = parseFloat(settings.token_to_quant_rate);
    const quantDelta = tokenAmount * rate;
    const newTokenBalance = tokenWallet.balance - tokenAmount;
    const newQuantBalance = parseFloat(wallet.quant_balance) + quantDelta;

    // 5) token_wallets.balance 차감
    await db.query(
      `UPDATE token_wallets
          SET balance    = ?,
              updated_at = NOW()
        WHERE id = ?`,
      [newTokenBalance, tokenWallet.id]
    );
    // 6) wallets.quant_balance 증가
    if (isNaN(newQuantBalance)) {
      console.error("❌ newQuantBalance가 NaN입니다. 계산 로직 확인 필요.");
      return res.status(400).json({ success: false, error: "계산된 잔액이 잘못되었습니다." });
    }

    // 6) wallets.quant_balance 증가
    await db.query(
      `UPDATE wallets
          SET quant_balance = ?,
              updated_at    = NOW()
        WHERE id = ?`,
      [newQuantBalance, wallet.id]
    );

    // 7) token_transactions 기록
    const txnId = uuidv4();
    await db.query(
      `INSERT INTO token_transactions
         (id, wallet_id, amount, type, status, description, created_at)
       VALUES (?, ?, ?, 'WITHDRAWAL', 'COMPLETED', ?, NOW())`,
      [txnId, tokenWallet.id, tokenAmount, "Token → Quant exchange"]
    );

    // 8) wallets_log 기록
    await db.query(
      `INSERT INTO wallets_log
         (user_id, category, log_date, direction, amount, balance_after,
          reference_type, reference_id, description, created_at)
       VALUES (?, 'quant', NOW(), 'in', ?, ?, 'token_exchange', ?, ?, NOW())`,
      [userId, quantDelta, newQuantBalance, "exchange", txnId, "토큰을 정량으로 교환"]
    );

    return res.json({
      success: true,
      data: {
        tokenWallet: {
          id: tokenWallet.id,
          newBalance: newTokenBalance,
          lockedAmount: tokenWallet.locked_amount
        },
        wallet: {
          id: wallet.id,
          newQuantBalance
        },
        transaction: {
          id: txnId,
          tokenAmount,
          quantAmount: quantDelta
        }
      }
    });

  } catch (err) {
    console.error("❌ exchange-token-to-quant error:", err);
    return next(err);
  }
});


// ▶ 내 교환 로그 조회 API
// GET /api/my/wallet-logs/exchange
router.get("/my/wallet-logs/exchange", async (req, res, next) => {
  const userId = req.session.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }

  try {
    const [logs] = await db.query(
      `SELECT
         id,
         user_id,
         category,
         log_date,
         direction,
         amount,
         balance_after,
         reference_type,
         reference_id,
         description,
         created_at,
         updated_at
       FROM wallets_log
       WHERE user_id = ?
         AND reference_type = 'token_exchange'
       ORDER BY log_date DESC`,
      [userId]
    );

    res.json({ success: true, data: logs });
  } catch (err) {
    console.error("❌ /my/wallet-logs/exchange error:", err);
    next(err);
  }
});
module.exports = router;
