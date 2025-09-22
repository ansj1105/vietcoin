// 📁 routes/withdrawals.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const axios = require('axios');
const { getTronBalance } = require('../routes/tron');
const USDT_CONTRACT = process.env.USDT_CONTRACT;
// 📁 routes/tron.js (기존 라우터 맨 아래에 추가)
const { getTronWeb } = require("../utils/tron");
const bcrypt = require('bcrypt');
const { ethers } = require('ethers');
// polling intervals
const DEPOSIT_POLL_INTERVAL = 2 * 60 * 1000;   // 2분
const REAL_AMOUNT_INTERVAL = 2 * 60 * 60 * 1000; // 2시간
const MAX_DEPOSIT_RETRIES = 10;

// 전체 지갑 목록 조회
// GET /api/withdrawals/wallets
// 📁 routes/withdrawals.js (또는 해당 라우터 파일)
router.get('/wallets', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        w.id            AS wallet_id,
        w.user_id       AS user_id,
        u.name          AS user_name,
        u.email         AS user_email,
        w.address,
        w.quant_balance,
        w.fund_balance,
        w.real_amount,
        w.real_bamount,
        w.updated_at
      FROM wallets w
      JOIN users u
        ON w.user_id = u.id
      ORDER BY w.updated_at DESC
    `);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('❌ /withdrawals/wallets 조회 실패:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch wallets' });
  }
});

// 📁 routes/withdrawals.js
router.post('/wallets/:id/deposit', async (req, res) => {
  const walletId = req.params.id;
  const { type, amount } = req.body;

  if (!['fund', 'quant'].includes(type) || isNaN(amount)) {
    return res.status(400).json({ success: false, error: 'Invalid type or amount' });
  }

  try {
    // 1) 지갑 조회
    const [[wallet]] = await db.query(
      `SELECT * FROM wallets WHERE id = ?`,
      [walletId]
    );
    if (!wallet) {
      return res.status(404).json({ success: false, error: 'Wallet not found' });
    }

    // 2) 새 잔액 계산
    const prevFund = parseFloat(wallet.fund_balance);
    const prevQuant = parseFloat(wallet.quant_balance);
    const amt = parseFloat(amount);

    const newFund = type === 'fund' ? prevFund + amt : prevFund;
    const newQuant = type === 'quant' ? prevQuant + amt : prevQuant;

    // 3) 지갑 테이블 업데이트
    await db.query(
      `UPDATE wallets 
         SET fund_balance  = ?, 
             quant_balance = ?, 
             updated_at     = NOW() 
       WHERE id = ?`,
      [newFund.toFixed(6), newQuant.toFixed(6), walletId]
    );

    // 4) wallets_log 에 로그 삽입
    const category = type === 'fund' ? 'funding' : 'quant';
    const balanceAfter = type === 'fund' ? newFund : newQuant;
    await db.query(
      `INSERT INTO wallets_log
         (user_id, category, log_date, direction, amount, balance_after,
          reference_type, reference_id, description, created_at, updated_at)
       VALUES
         (?,       ?,        NOW(),     'in',      ?,      ?,             ?,            ?,            ?,           NOW(),      NOW())`,
      [
        wallet.user_id,
        category,
        amt.toFixed(6),
        balanceAfter.toFixed(6),
        'admin_deposit',    // reference_type
        walletId,           // reference_id
        '관리자 수동 입금'     // description
      ]
    );

    // 5) 결과 반환
    return res.json({
      success: true,
      data: {
        wallet_id: walletId,
        fund_balance: newFund.toFixed(6),
        quant_balance: newQuant.toFixed(6),
      }
    });
  } catch (err) {
    console.error('❌ 입금 처리 오류:', err);
    return res.status(500).json({ success: false, error: 'Deposit failed' });
  }
});




// ── 2) PENDING 입금 처리 스케줄러용 함수 ─────────────────────────────────────────
async function processPendingDeposits() {
  try {
    const [rows] = await db.query(
      `SELECT id, to_address AS address, initial_balance, retry_count
       FROM withdrawals
       WHERE flow_type='DEPOSIT' AND status='PENDING'`
    );

    for (const w of rows) {
      let current;
      try {
        current = await getTronBalance(w.address);
      } catch (err) {
        console.error(`❌ [Deposit#${w.id}] Tronscan 조회 실패:`, err.message);
        continue;
      }

      if (current > w.initial_balance) {
        const diff = +(current - w.initial_balance).toFixed(6);
        await db.query(
          `UPDATE withdrawals
             SET amount = ?, status='SUCCESS', updated_at=NOW()
           WHERE id = ?`,
          [diff, w.id]
        );
        await db.query(
          `UPDATE wallets
             SET fund_balance = fund_balance + ?, updated_at = NOW()
           WHERE address = ?`,
          [diff, w.address]
        );
        console.log(`✅ [Deposit#${w.id}] +${diff} USDT 입금 완료`);
      } else {
        const tries = w.retry_count + 1;
        if (tries >= MAX_DEPOSIT_RETRIES) {
          await db.query(
            `UPDATE withdrawals
               SET status='FAILED', reason='잔액 변동 없음', retry_count=?, updated_at=NOW()
             WHERE id = ?`,
            [tries, w.id]
          );
          console.warn(`⚠️ [Deposit#${w.id}] 최대 재시도 초과, FAILED 처리`);
        } else {
          await db.query(
            `UPDATE withdrawals
               SET retry_count = ?
             WHERE id = ?`,
            [tries, w.id]
          );
          console.log(`🔄 [Deposit#${w.id}] 아직 입금 전, 재시도 ${tries}`);
        }
      }
    }
  } catch (err) {
    console.error('❌ processPendingDeposits 전체 실패:', err);
  }
}
// ── 3) real_amount 동기화 함수 (전체) ────────────────────────────────────────
async function updateAllRealAmounts() {
  try {
    const [wallets] = await db.query(
      'SELECT id, address, user_id FROM wallets WHERE address IS NOT NULL'
    );
    console.log('📝 updateAllRealAmounts - wallets to update:', wallets);
    const results = [];
    for (const w of wallets) {
      const result = await updateRealAmountFor(w.id, w.address, w.user_id);
      results.push(result);
    }
    return results;
  } catch (err) {
    console.error('❌ updateAllRealAmounts 실패:', err);
    throw err;
  }
}

// ── 공통: 단일 지갑 real_amount 업데이트 헬퍼 ─────────────────────────────────
async function updateRealAmountFor(id, address, userId) {
  // 이전 real_amount 조회
  const [[prevRow]] = await db.query(
    'SELECT real_amount FROM wallets WHERE id = ?', [id]
  );
  const prevAmt = prevRow && prevRow.real_amount ? Number(prevRow.real_amount) : 0;

  if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address)) {
    return { id, address, error: 'Invalid address' };
  }

  // TRON 잔액 조회
  const apiRes = await axios.get(
    'https://apilist.tronscanapi.com/api/accountv2',
    { params: { address }, headers: { 'TRON-PRO-API-KEY': process.env.TRON_API_KEY2 } }
  );
  const usdtAsset = apiRes.data.withPriceTokens?.find(t => t.tokenId === USDT_CONTRACT);
  const usdt = usdtAsset ? Number(usdtAsset.balance) / 1e6 : 0;
  console.log(`🔍 updateRealAmountFor walletId=${id}, address=${address}, prevAmt=${prevAmt}, fetched=${usdt}`);

  // 차이(diff) 계산 및 업데이트
  const diff = +(usdt - prevAmt).toFixed(6);
  await db.query(
    'UPDATE wallets SET real_amount = ?, updated_at = NOW() WHERE id = ?',
    [usdt.toFixed(6), id]
  );
  // 2) real_amount가 증가했으면 fund_balance에도 동일 금액만큼 추가
  if (diff > 0) {
    await db.query(
      'UPDATE wallets SET fund_balance = fund_balance + ? WHERE id = ?',
      [diff, id]
    );
  }

  await db.query(
    'INSERT INTO balance_log (address, balance_usdt) VALUES (?, ?)',
    [address, usdt.toFixed(6)]
  );

  // 변화가 있으면 withdrawals에 기록
  if (diff !== 0) {
    const flowType = diff > 0 ? 'DEPOSIT' : 'WITHDRAWAL';
    const amount = Math.abs(diff);
    await db.query(
      `INSERT INTO withdrawals
         (user_id, amount, to_address, method, status, flow_type,
          initial_balance, retry_count, created_at)
       VALUES (?, ?, ?, 'TRC-20', 'SUCCESS', ?, ?, 0, NOW())`,
      [userId, amount, address, flowType, prevAmt]
    );

    const balanceSql = diff > 0
      ? 'UPDATE wallets SET fund_balance = fund_balance + ?, updated_at = NOW() WHERE id = ?'
      : 'UPDATE wallets SET fund_balance = fund_balance - ?, updated_at = NOW() WHERE id = ?';
    await db.query(balanceSql, [amount, id]);
  }

  return { id, address, real_amount: usdt.toFixed(6), diff };
}
// ▶ API: 전체 지갑 real_amount 조회/업데이트
router.get('/real-amount/all', async (_req, res) => {
  try {
    const results = await updateAllRealAmounts();
    return res.json({ success: true, results });
  } catch (err) {
    console.error('❌ /real-amount/all 실패:', err);
    return res.status(500).json({ success: false, error: 'Failed to update all real_amounts' });
  }
});
// ▶ API: 단일 지갑 real_amount 조회/업데이트
router.get('/real-amount/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    // user_id 까지 같이 SELECT
    const [[wallet]] = await db.query(
      'SELECT id, address, user_id FROM wallets WHERE id = ?', [id]
    );
    if (!wallet) {
      return res.status(404).json({ success: false, error: 'Wallet not found' });
    }
    if (!wallet.user_id) {
      return res
        .status(400)
        .json({ success: false, error: '이 지갑은 사용자에 연결되어 있지 않습니다.' });
    }

    const result = await updateRealAmountFor(
      wallet.id, wallet.address, wallet.user_id
    );
    return res.json({ success: true, result });
  } catch (err) {
    console.error('❌ /real-amount/:id 실패:', err);
    return res.status(500).json({ success: false, error: 'Failed to update real_amount' });
  }
});


// ▶ 주소 유효성 검사
// GET /api/tron/validate-address?address=<주소>&type=<trx|usdt>
router.get('/validate-address', async (req, res) => {
  const { address = '', type = 'trx' } = req.query;
  const tronWeb = getTronWeb();

  // 1) 기본 형식 검사
  if (!tronWeb.isAddress(address)) {
    return res.json({ success: true, valid: false, reason: 'Invalid address format' });
  }

  // 2) USDT (TRC20) 전송 가능 여부 검사 (선택)
  if (type.toLowerCase() === 'usdt') {
    try {
      const contract = await tronWeb.contract().at(USDT_CONTRACT);
      // balanceOf 호출해보면 컨트랙트 상에 있는 유효한 주소인지 확인 가능
      await contract.methods.balanceOf(address).call();
      return res.json({ success: true, valid: true });
    } catch (err) {
      // 호출 실패 시 USDT 전송 불가능 주소로 간주
      return res.json({ success: true, valid: false, reason: 'Cannot interact with USDT contract' });
    }
  }

  // 3) TRX 전송만 검증
  return res.json({ success: true, valid: true });
});



// ▶ 사용자 등급따른 출금가능금액 조회 
router.get('/withdraw/remain', async (req, res) => {
  const userId = req.session.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }

  const conn = await db.getConnection();
  try {
    // ✅ [1] 유저의 VIP 레벨 조회
    const [[user]] = await conn.query(`SELECT vip_level FROM users WHERE id = ?`, [userId]);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const vipLevel = user.vip_level;

    // ✅ [2] vip_level에 해당하는 출금 설정 불러오기
    const [[limit]] = await conn.query(
      `SELECT min_amount, daily_max_amount FROM withdrawals_settings WHERE level = ?`,
      [vipLevel]
    );
    if (!limit) {
      return res.status(404).json({ success: false, error: 'Withdrawal settings not found for this VIP level' });
    }

    // ✅ [3] 현재 지갑 잔액 조회
    const [[wallet]] = await conn.query(
      `SELECT quant_balance FROM wallets WHERE user_id = ?`,
      [userId]
    );
    if (!wallet) {
      return res.status(404).json({ success: false, error: 'Wallet not found' });
    }

    // ✅ [4] 출금 수수료율 조회
    const [[setting]] = await conn.query(
      `SELECT real_withdraw_fee FROM wallet_settings ORDER BY id DESC LIMIT 1`
    );
    const feeRate = setting ? parseFloat(setting.real_withdraw_fee) : 0;

    // ✅ [5] 당일 출금액 조회 (SUCCESS 상태만)
    const [[dailyWithdrawal]] = await conn.query(
      `SELECT COALESCE(SUM(amount), 0) AS today_total
       FROM withdrawals
      WHERE user_id = ?
        AND DATE(created_at) = CURDATE()
        AND status = 'SUCCESS'
        AND flow_type = 'WITHDRAWAL'`,
      [userId]
    );
    const todayWithdrawn = parseFloat(dailyWithdrawal.today_total);

    // ✅ [6] 계산
    const minAmount = parseFloat(limit.min_amount);
    const maxDailyAmount = parseFloat(limit.daily_max_amount);
    const currentBalance = parseFloat(wallet.quant_balance);
    const remainingDailyLimit = maxDailyAmount - todayWithdrawn;

    // 수수료를 고려한 실제 출금 가능 금액 계산
    const maxWithdrawableWithFee = currentBalance / (1 + feeRate);
    const actualMaxWithdrawable = Math.min(remainingDailyLimit, maxWithdrawableWithFee);

    res.json({
      success: true,
      vip_level: vipLevel,
      min_amount: minAmount,
      max_daily_amount: maxDailyAmount,
      current_balance: currentBalance,
      today_withdrawn: todayWithdrawn,
      remaining_daily_limit: remainingDailyLimit,
      fee_rate: feeRate,
      max_withdrawable: parseFloat(actualMaxWithdrawable.toFixed(6)),
      can_withdraw: actualMaxWithdrawable >= minAmount
    });

  } catch (err) {
    console.error('❌ withdraw/remain error:', err);
    res.status(500).json({ success: false, error: 'Failed to get withdrawal limits' });
  } finally {
    conn.release();
  }
});

// ▶ 사용자 출금 요청 (수수료 반영 + wallets_log 기록)
// POST /api/wallets/withdraw
router.post('/withdraw', async (req, res) => {

  const userId = req.session.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }

  const { to_address, amount, method } = req.body;
  const amt = parseFloat(amount);
  if (!to_address || !amt || amt <= 0 || !['TRX', 'USDT', 'BANK'].includes(method)) {
    return res.status(400).json({ success: false, error: 'Invalid parameters' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // ✅ [1] 유저의 VIP 레벨 조회
    const [[user]] = await conn.query(`SELECT vip_level FROM users WHERE id = ?`, [userId]);
    if (!user) throw new Error('USER_NOT_FOUND');
    const vipLevel = user.vip_level;

    // ✅ [2] vip_level에 해당하는 출금 설정 불러오기
    const [[limit]] = await conn.query(
      `SELECT min_amount, daily_max_amount FROM withdrawals_settings WHERE level = ?`,
      [vipLevel]
    );
    if (!limit) throw new Error('WITHDRAWAL_SETTING_NOT_FOUND');

    if (amt < limit.min_amount) {
      return res.status(400).json({
        success: false,
        error: `Minimum withdrawal for your level is ${limit.min_amount}`
      });
    }

    // ✅ [3] 당일 SUCCESS 상태 출금 합계 조회
    const [[dailySuccess]] = await conn.query(
      `SELECT COALESCE(SUM(amount), 0) AS today_total
       FROM withdrawals
      WHERE user_id = ?
        AND DATE(created_at) = CURDATE()
        AND status = 'SUCCESS'
        AND flow_type = 'WITHDRAWAL'`,
      [userId]
    );
    const todayTotal = parseFloat(dailySuccess.today_total);
    const projectedTotal = todayTotal + amt;

    if (projectedTotal > parseFloat(limit.daily_max_amount)) {
      return res.status(400).json({
        success: false,
        error: `Daily withdrawal limit exceeded. Max: ${limit.daily_max_amount}, Used: ${todayTotal}`
      });
    }

    // ✅ [4] 현재 PENDING 출금이 있으면 차단
    const [[pendingCheck]] = await conn.query(
      `SELECT COUNT(*) AS cnt
       FROM withdrawals
      WHERE user_id = ?
        AND status = 'PENDING'
        AND flow_type = 'WITHDRAWAL'`,
      [userId]
    );
    if (pendingCheck.cnt > 0) {
      return res.status(400).json({
        success: false,
        error: 'You have a pending withdrawal request. Please wait until it is processed.'
      });
    }

    // ▶ 출금 수수료율 조회
    const [[setting]] = await conn.query(
      `SELECT real_withdraw_fee FROM wallet_settings ORDER BY id DESC LIMIT 1`
    );
    const feeRate = setting ? parseFloat(setting.real_withdraw_fee) : 0;

    // ▶ 현재 지갑 잔액 조회
    const [[wallet]] = await conn.query(
      `SELECT quant_balance FROM wallets WHERE user_id = ? FOR UPDATE`,
      [userId]
    );
    if (!wallet) throw new Error('NO_WALLET');

    // ▶ 수수료 계산 및 잔액 체크
    const feeAmount = parseFloat((amt * feeRate).toFixed(6));
    const totalDeduct = parseFloat((amt + feeAmount).toFixed(6));
    if (wallet.quant_balance < totalDeduct) {
      return res.status(400).json({ success: false, error: 'Insufficient quant_balance (including fee)' });
    }

    // ▶ 잔액 차감
    const newBal = parseFloat((wallet.quant_balance - totalDeduct).toFixed(6));
    await conn.query(
      `UPDATE wallets SET quant_balance = ?, updated_at = NOW() WHERE user_id = ?`,
      [newBal, userId]
    );

    // ▶ withdrawals 테이블 기록
    const [result] = await conn.query(
      `INSERT INTO withdrawals
         (user_id, amount, to_address, method, status, reason,
          initial_balance, retry_count, tx_id, flow_type, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'PENDING', ?, ?, 0, NULL, 'WITHDRAWAL', NOW(), NOW())`,
      [
        userId,
        amt,
        to_address,
        method,
        `fee:${feeAmount}`,
        wallet.quant_balance
      ]
    );
    const withdrawalId = result.insertId;

    // ▶ 로그 기록
    await conn.query(
      `INSERT INTO wallets_log
         (user_id, category, log_date, direction, amount, balance_after,
          reference_type, reference_id, description, created_at, updated_at)
       VALUES (?, 'quant', NOW(), 'out', ?, ?, 'withdrawal_request', ?, ?, NOW(), NOW())`,
      [
        userId,
        totalDeduct,
        newBal,
        withdrawalId,
        `Withdrawal request ${amt} (${method}), fee ${feeAmount}`
      ]
    );

    await conn.commit();

    res.json({
      success: true,
      withdrawal_id: withdrawalId,
      requested: amt,
      fee: feeAmount,
      total_deducted: totalDeduct,
      balance_after: newBal,
      status: 'PENDING'
    });
  } catch (err) {
    await conn.rollback();
    console.error('❌ withdraw error:', err);
    if (err.message === 'NO_WALLET') {
      return res.status(404).json({ success: false, error: 'Wallet not found' });
    }
    res.status(500).json({ success: false, error: 'Withdrawal request failed' });
  } finally {
    conn.release();
  }
});

// ▶ 서버 시작 시 즉시 실행 및 스케줄러 등록
processPendingDeposits();
//updateAllRealAmounts();
setInterval(processPendingDeposits, DEPOSIT_POLL_INTERVAL);
setInterval(updateAllRealAmounts, REAL_AMOUNT_INTERVAL);
setInterval(updateAllBNBAmounts, REAL_AMOUNT_INTERVAL);

// ▶ 기존 스케줄러

// ▶ 서버 시작 시 즉시 실행 및 스케줄러 등록
//processRealAmounts();


// ▶ 1) 대기 중인 출금 요청 목록 조회
// GET /api/admin/withdrawals?status=PENDING
router.get('/', async (req, res) => {
  const status = req.query.status || 'PENDING';
  try {
    const [rows] = await db.query(
      `SELECT 
         w.id, w.user_id, w.amount, w.to_address as wallet_address, 
         w.method, w.status, w.reason, w.created_at, w.updated_at,
         u.name, u.email as user_email
       FROM withdrawals w
       JOIN users u ON u.id = w.user_id
       WHERE w.status = ? AND w.flow_type = 'WITHDRAWAL'
       ORDER BY w.created_at DESC`,
      [status]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('❌ fetch withdrawals error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch withdrawals' });
  }
});

// ▶ 2) 출금 요청 승인
// PUT /api/admin/withdrawals/:id/approve
router.put('/:id/approve', async (req, res) => {
  const id = req.params.id;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1) 출금 요청 조회
    const [[wd]] = await conn.query(
      `SELECT user_id, amount, reason 
         FROM withdrawals 
        WHERE id = ? AND status = 'PENDING' 
        FOR UPDATE`,
      [id]
    );
    if (!wd) return res.status(404).json({ success: false, error: 'Withdrawal not found or not pending' });

    // 2) withdrawals 상태 변경
    await conn.query(
      `UPDATE withdrawals 
         SET status = 'SUCCESS', updated_at = NOW() 
       WHERE id = ?`,
      [id]
    );

    // 3) wallets_log 에 완료 로그 추가
    //    이미 PENDING 시점에 차감했으니 direction = 'out' 만 기록
    await conn.query(
      `INSERT INTO wallets_log
         (user_id, category, log_date, direction, amount, balance_after,
          reference_type, reference_id, description, created_at, updated_at)
       VALUES (?, 'quant', NOW(), 'out', ?, 
               (SELECT quant_balance FROM wallets WHERE user_id = ?),
               'withdrawal', ?, 'Withdrawal approved', NOW(), NOW())`,
      [wd.user_id, wd.amount, wd.user_id, id]
    );

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error('❌ approve withdrawal error:', err);
    res.status(500).json({ success: false, error: 'Failed to approve withdrawal' });
  } finally {
    conn.release();
  }
});

// ▶ 3) 출금 요청 거절
// PUT /api/admin/withdrawals/:id/reject
router.put('/:id/reject', async (req, res) => {
  const id = req.params.id;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1) 출금 요청 조회
    const [[wd]] = await conn.query(
      `SELECT user_id, amount, reason 
         FROM withdrawals 
        WHERE id = ? AND status = 'PENDING' 
        FOR UPDATE`,
      [id]
    );
    if (!wd) return res.status(404).json({ success: false, error: 'Withdrawal not found or not pending' });

    // 2) wallets.quant_balance 환불
    await conn.query(
      `UPDATE wallets 
         SET quant_balance = quant_balance + ?, updated_at = NOW() 
       WHERE user_id = ?`,
      [wd.amount, wd.user_id]
    );

    // 3) withdrawals 상태 변경
    await conn.query(
      `UPDATE withdrawals 
         SET status = 'FAILED', updated_at = NOW() 
       WHERE id = ?`,
      [id]
    );

    // 4) wallets_log 에 환불 로그 추가
    await conn.query(
      `INSERT INTO wallets_log
         (user_id, category, log_date, direction, amount, balance_after,
          reference_type, reference_id, description, created_at, updated_at)
       VALUES (?, 'quant', NOW(), 'in', ?, 
               (SELECT quant_balance FROM wallets WHERE user_id = ?),
               'withdrawal_reject', ?, 'Withdrawal rejected', NOW(), NOW())`,
      [wd.user_id, wd.amount, wd.user_id, id]
    );

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error('❌ reject withdrawal error:', err);
    res.status(500).json({ success: false, error: 'Failed to reject withdrawal' });
  } finally {
    conn.release();
  }
});

// GET /api/admin/wallet-settings
router.get('/admin/wallet-settings', async (_req, res) => {
  try {
    const [[settings]] = await db.query(
      `SELECT id, deposit_fee_rate, withdraw_fee_rate, real_withdraw_fee,
              auto_approve, token_to_quant_rate, minimum_deposit_amount, updated_at
         FROM wallet_settings
       ORDER BY id DESC
       LIMIT 1`
    );
    res.json({ success: true, data: settings || null });
  } catch (err) {
    console.error('❌ 설정 조회 실패:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

// PUT /api/admin/wallet-settings
router.put('/admin/wallet-settings', async (req, res) => {
  const {
    deposit_fee_rate,
    withdraw_fee_rate,
    real_withdraw_fee,
    auto_approve,
    token_to_quant_rate,
    minimum_deposit_amount
  } = req.body;

  // 필수값 검사
  if (
    deposit_fee_rate == null ||
    withdraw_fee_rate == null ||
    token_to_quant_rate == null ||
    minimum_deposit_amount == null ||
    !['auto', 'manual'].includes(auto_approve)
  ) {
    return res.status(400).json({ success: false, error: 'Missing or invalid fields' });
  }

  try {
    const [[existing]] = await db.query(
      `SELECT id FROM wallet_settings ORDER BY id DESC LIMIT 1`
    );

    if (existing) {
      await db.query(
        `UPDATE wallet_settings
           SET deposit_fee_rate     = ?,
               withdraw_fee_rate    = ?,
               real_withdraw_fee    = ?,
               auto_approve         = ?,
               token_to_quant_rate  = ?,
               minimum_deposit_amount = ?,
               updated_at           = NOW()
         WHERE id = ?`,
        [
          deposit_fee_rate,
          withdraw_fee_rate,
          real_withdraw_fee || null,
          auto_approve,
          token_to_quant_rate,
          minimum_deposit_amount,
          existing.id
        ]
      );
      res.json({ success: true, data: { id: existing.id } });
    } else {
      const [result] = await db.query(
        `INSERT INTO wallet_settings
           (deposit_fee_rate, withdraw_fee_rate, real_withdraw_fee,
            auto_approve, token_to_quant_rate, minimum_deposit_amount, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          deposit_fee_rate,
          withdraw_fee_rate,
          real_withdraw_fee || null,
          auto_approve,
          token_to_quant_rate,
          minimum_deposit_amount
        ]
      );
      res.json({ success: true, data: { id: result.insertId } });
    }
  } catch (err) {
    console.error('❌ 설정 저장 실패:', err);
    res.status(500).json({ success: false, error: 'Failed to save settings' });
  }
});

// GET /api/admin/withdrawals-settings - 출금 설정 목록 조회
router.get('/admin/withdrawals-settings', async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT level, min_amount, daily_max_amount, created_at, updated_at
         FROM withdrawals_settings
         ORDER BY level ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('❌ 출금 설정 조회 실패:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch withdrawal settings' });
  }
});

// POST /api/admin/withdrawals-settings - 출금 설정 추가
router.post('/admin/withdrawals-settings', async (req, res) => {
  const { level, min_amount, daily_max_amount } = req.body;

  // 필수값 검사
  if (level == null || min_amount == null || daily_max_amount == null) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  // level은 1-10 범위로 제한
  if (level < 1 || level > 10) {
    return res.status(400).json({ success: false, error: 'Level must be between 1 and 10' });
  }

  try {
    // 기존 level이 있는지 확인
    const [[existing]] = await db.query(
      `SELECT level FROM withdrawals_settings WHERE level = ?`,
      [level]
    );

    if (existing) {
      return res.status(400).json({ success: false, error: `Level ${level} already exists` });
    }

    const [result] = await db.query(
      `INSERT INTO withdrawals_settings (level, min_amount, daily_max_amount, created_at, updated_at)
       VALUES (?, ?, ?, NOW(), NOW())`,
      [level, min_amount, daily_max_amount]
    );

    res.json({ success: true, data: { id: result.insertId, level } });
  } catch (err) {
    console.error('❌ 출금 설정 추가 실패:', err);
    res.status(500).json({ success: false, error: 'Failed to add withdrawal setting' });
  }
});

// PUT /api/admin/withdrawals-settings/:level - 출금 설정 수정
router.put('/admin/withdrawals-settings/:level', async (req, res) => {
  const level = parseInt(req.params.level);
  const { min_amount, daily_max_amount } = req.body;

  // 필수값 검사
  if (min_amount == null || daily_max_amount == null) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    const [result] = await db.query(
      `UPDATE withdrawals_settings
         SET min_amount = ?, daily_max_amount = ?, updated_at = NOW()
       WHERE level = ?`,
      [min_amount, daily_max_amount, level]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: `Level ${level} not found` });
    }

    res.json({ success: true, data: { level } });
  } catch (err) {
    console.error('❌ 출금 설정 수정 실패:', err);
    res.status(500).json({ success: false, error: 'Failed to update withdrawal setting' });
  }
});

// DELETE /api/admin/withdrawals-settings/:level - 출금 설정 삭제
router.delete('/admin/withdrawals-settings/:level', async (req, res) => {
  const level = parseInt(req.params.level);

  try {
    const [result] = await db.query(
      `DELETE FROM withdrawals_settings WHERE level = ?`,
      [level]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: `Level ${level} not found` });
    }

    res.json({ success: true, data: { level } });
  } catch (err) {
    console.error('❌ 출금 설정 삭제 실패:', err);
    res.status(500).json({ success: false, error: 'Failed to delete withdrawal setting' });
  }
});

// ▶ 사용자별 입·출금 내역 조회
// GET /api/withdrawals/history?flow_type=WITHDRAWAL
router.get('/history', async (req, res) => {
  const userId = req.session.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }

  // 선택적 쿼리 파라미터: DEPOSIT, WITHDRAWAL
  const flowType = req.query.flow_type;
  const allowed = ['DEPOSIT', 'WITHDRAWAL'];
  const params = [userId];
  let sql = `
    SELECT 
      id, amount, to_address, method,
      status, reason, tx_id,
      flow_type, initial_balance, retry_count,
      created_at, updated_at
    FROM withdrawals
    WHERE user_id = ?
  `;

  if (flowType && allowed.includes(flowType.toUpperCase())) {
    sql += ` AND flow_type = ?`;
    params.push(flowType.toUpperCase());
  }

  sql += ` ORDER BY created_at DESC`;

  try {
    const [rows] = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('❌ 조회 오류:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
});

// ▶ 거래 비밀번호 설정
// POST /api/withdrawals/set-trade-password
router.post('/set-trade-password', async (req, res) => {
  const userId = req.session.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }

  const { trade_password } = req.body;
  if (!trade_password || trade_password.length < 6) {
    return res.status(400).json({ success: false, error: 'Invalid trade password' });
  }

  try {
    // 1) 현재 거래 비밀번호 확인
    const [[user]] = await db.query(
      'SELECT trade_password FROM users WHERE id = ?',
      [userId]
    );

    if (user.trade_password) {
      return res.status(400).json({ success: false, error: 'Trade password already set' });
    }

    // 2) 거래 비밀번호 해시
    const hash = await bcrypt.hash(trade_password, 10);

    // 3) 해시된 거래 비밀번호 저장
    await db.query(
      'UPDATE users SET trade_password = ? WHERE id = ?',
      [hash, userId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('❌ 거래 비밀번호 설정 실패:', err);
    res.status(500).json({ success: false, error: 'Failed to set trade password' });
  }
});

// ▶ 거래 비밀번호 설정 여부 확인
// GET /api/withdrawals/verify-trade-password
router.get('/verify-trade-password', async (req, res) => {
  const userId = req.session.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }

  try {
    const [[user]] = await db.query(
      'SELECT trade_password FROM users WHERE id = ?',
      [userId]
    );

    // 거래 비밀번호가 설정되어 있는지 확인
    if (!user.trade_password) {
      return res.json({ success: false, error: 'Trade password not set' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('❌ 거래 비밀번호 확인 실패:', err);
    res.status(500).json({ success: false, error: 'Failed to verify trade password' });
  }
});

// ▶ 거래 비밀번호 확인 (POST - 실제 비밀번호 검증용)
// POST /api/withdrawals/verify-trade-password
router.post('/verify-trade-password', async (req, res) => {
  const userId = req.session.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }

  const { trade_password } = req.body;
  if (!trade_password) {
    return res.status(400).json({ success: false, error: 'Trade password required' });
  }

  try {
    const [[user]] = await db.query(
      'SELECT trade_password FROM users WHERE id = ?',
      [userId]
    );

    if (!user.trade_password) {
      return res.status(400).json({ success: false, error: 'Trade password not set' });
    }

    // 해시된 비밀번호 비교
    const match = await bcrypt.compare(trade_password, user.trade_password);
    if (!match) {
      return res.status(400).json({ success: false, error: 'Invalid trade password' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('❌ 거래 비밀번호 확인 실패:', err);
    res.status(500).json({ success: false, error: 'Failed to verify trade password' });
  }
});

//이더리움관련

// BNB 지갑 잔액 업데이트 헬퍼 함수
async function updateBNBAmountFor(id, address, userId) {
  try {
    // 이전 real_bamount 조회
    const [[prevRow]] = await db.query(
      'SELECT real_bamount FROM wallets WHERE id = ?', [id]
    );
    const prevAmt = prevRow && prevRow.real_bamount ? Number(prevRow.real_bamount) : 0;

    // BNB 잔액 조회 (BSC 메인넷)
    const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
    const balanceWei = await provider.getBalance(address);
    const balanceBNB = Number(ethers.formatEther(balanceWei));

    console.log(`🔍 updateBNBAmountFor walletId=${id}, address=${address}, prevAmt=${prevAmt}, fetched=${balanceBNB}`);

    // 차이(diff) 계산 및 업데이트
    const diff = +(balanceBNB - prevAmt).toFixed(6);
    await db.query(
      'UPDATE wallets SET real_bamount = ?, updated_at = NOW() WHERE id = ?',
      [balanceBNB.toFixed(6), id]
    );

    // real_bamount가 증가했으면 fund_balance에도 동일 금액만큼 추가
    if (diff > 0) {
      await db.query(
        'UPDATE wallets SET fund_balance = fund_balance + ? WHERE id = ?',
        [diff, id]
      );
    }

    // balance_log에 기록
    await db.query(
      'INSERT INTO balance_log (address, balance_bnb) VALUES (?, ?)',
      [address, balanceBNB.toFixed(6)]
    );

    // 변화가 있으면 withdrawals에 기록
    if (diff !== 0) {
      const flowType = diff > 0 ? 'DEPOSIT' : 'WITHDRAWAL';
      const amount = Math.abs(diff);
      await db.query(
        `INSERT INTO withdrawals
           (user_id, amount, to_address, method, status, flow_type,
            initial_balance, retry_count, created_at)
         VALUES (?, ?, ?, 'BEP-20', 'SUCCESS', ?, ?, 0, NOW())`,
        [userId, amount, address, flowType, prevAmt]
      );
    }

    return { id, address, real_bamount: balanceBNB.toFixed(6), diff };
  } catch (err) {
    console.error(`❌ updateBNBAmountFor 실패 (walletId=${id}):`, err);
    return { id, address, error: err.message };
  }
}

// 전체 BNB 지갑 잔액 업데이트
async function updateAllBNBAmounts() {
  try {
    const [wallets] = await db.query(
      'SELECT w.id, b.address, w.user_id FROM wallets w JOIN bnb_log b ON w.user_id = b.user_id'
    );
    console.log('📝 updateAllBNBAmounts - wallets to update:', wallets);

    const results = [];
    for (const w of wallets) {
      const result = await updateBNBAmountFor(w.id, w.address, w.user_id);
      results.push(result);
    }
    return results;
  } catch (err) {
    console.error('❌ updateAllBNBAmounts 실패:', err);
    throw err;
  }
}

// ▶ API: 전체 BNB 지갑 real_bamount 조회/업데이트
router.get('/real-bnb-amount/all', async (_req, res) => {
  try {
    const results = await updateAllBNBAmounts();
    return res.json({ success: true, results });
  } catch (err) {
    console.error('❌ /real-bnb-amount/all 실패:', err);
    return res.status(500).json({ success: false, error: 'Failed to update all BNB amounts' });
  }
});

// ▶ API: 단일 BNB 지갑 real_bamount 조회/업데이트
router.get('/real-bnb-amount/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    // bnb_log와 wallets 테이블 조인하여 조회
    const [[wallet]] = await db.query(
      `SELECT w.id, b.address, w.user_id 
       FROM wallets w 
       JOIN bnb_log b ON w.user_id = b.user_id 
       WHERE w.id = ?`,
      [id]
    );

    if (!wallet) {
      return res.status(404).json({ success: false, error: 'Wallet not found' });
    }

    if (!wallet.user_id) {
      return res.status(400).json({
        success: false,
        error: '이 지갑은 사용자에 연결되어 있지 않습니다.'
      });
    }

    const result = await updateBNBAmountFor(wallet.id, wallet.address, wallet.user_id);
    return res.json({ success: true, result });
  } catch (err) {
    console.error('❌ /real-bnb-amount/:id 실패:', err);
    return res.status(500).json({ success: false, error: 'Failed to update BNB amount' });
  }
});

//유저의 전체 bnb 주소조회
router.get('/bnb-address/all', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT user_id, address FROM bnb_log');
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('❌ /bnb-address/all 실패:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch BNB addresses' });
  }
});

// ========== BNB 관리자용 API ==========

// BNB 지갑 목록 조회
router.get('/admin/bnb-wallets', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT w.id, w.user_id, b.address, w.real_bamount as balance, w.updated_at
      FROM wallets w 
      JOIN bnb_log b ON w.user_id = b.user_id
      WHERE b.address IS NOT NULL
      ORDER BY w.updated_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ BNB 지갑 목록 조회 실패:', err);
    res.status(500).json({ error: 'Failed to fetch BNB wallets' });
  }
});

// BNB 주소 목록 조회
router.get('/admin/bnb-addresses', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT b.id, b.user_id, b.address, u.email, w.real_bamount as balance
      FROM bnb_log b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN wallets w ON b.user_id = w.user_id
      ORDER BY b.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ BNB 주소 목록 조회 실패:', err);
    res.status(500).json({ error: 'Failed to fetch BNB addresses' });
  }
});

// BNB 관리자 설정 조회
router.get('/admin/bnb-settings', async (req, res) => {
  try {
    const [[row]] = await db.query(
      'SELECT admin_address, threshold FROM bnb_settings ORDER BY id DESC LIMIT 1'
    );
    res.json(row || {});
  } catch (err) {
    console.error('❌ BNB 관리자 설정 조회 실패:', err);
    res.status(500).json({ error: 'Failed to fetch BNB settings' });
  }
});

// BNB 관리자 설정 저장
router.post('/admin/bnb-settings', async (req, res) => {
  const { admin_address, threshold, admin_wallet_id } = req.body;
  if (!admin_address || !threshold) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    await db.query(
      'INSERT INTO bnb_settings (admin_address, threshold, admin_wallet_id) VALUES (?, ?, ?)',
      [admin_address, threshold, admin_wallet_id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('❌ BNB 설정 저장 실패:', err);
    res.status(500).json({ error: 'Failed to save BNB settings' });
  }
});

// BNB 잔액 조회
router.get('/admin/bnb-balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const balance = await getBNBBalance(address);
    res.json({ balance });
  } catch (err) {
    console.error('❌ BNB 잔액 조회 실패:', err);
    res.status(500).json({ error: 'Failed to fetch BNB balance' });
  }
});

// BNB 전송
router.post('/admin/bnb-transfer', async (req, res) => {
  try {
    const { from_wallet_id, to_address, amount } = req.body;

    // 지갑 정보 조회
    const [[wallet]] = await db.query(
      'SELECT w.user_id, b.address FROM wallets w JOIN bnb_log b ON w.user_id = b.user_id WHERE w.id = ?',
      [from_wallet_id]
    );

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // 실제 BNB 전송 로직은 Web3 라이브러리 필요
    // 여기서는 시뮬레이션
    const txHash = `0x${Math.random().toString(16).substr(2, 64)}`;

    // 트랜잭션 로그 기록
    await db.query(
      'INSERT INTO bnb_transaction_log (from_address, to_address, amount, tx_hash, status, created_at) VALUES (?, ?, ?, ?, "SUCCESS", NOW())',
      [wallet.address, to_address, amount, txHash]
    );

    res.json({ success: true, txHash });
  } catch (err) {
    console.error('❌ BNB 전송 실패:', err);
    res.status(500).json({ error: 'Transfer failed' });
  }
});

// BNB 트랜잭션 내역 조회
router.get('/admin/bnb-transactions', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        id,
        from_address,
        to_address,
        amount,
        tx_hash,
        status,
        created_at,
        CASE 
          WHEN from_address IN (SELECT address FROM bnb_log) THEN 'send'
          ELSE 'receive'
        END as type
      FROM bnb_transaction_log
      ORDER BY created_at DESC
      LIMIT 100
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ BNB 트랜잭션 내역 조회 실패:', err);
    res.status(500).json({ error: 'Failed to fetch BNB transactions' });
  }
});

// BNB 회수
router.post('/admin/bnb-reclaim', async (req, res) => {
  try {
    const { wallet_id } = req.body;

    // 지갑 정보 조회
    const [[wallet]] = await db.query(
      'SELECT w.user_id, b.address, w.real_bamount FROM wallets w JOIN bnb_log b ON w.user_id = b.user_id WHERE w.id = ?',
      [wallet_id]
    );

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // 관리자 설정 조회
    const [[setting]] = await db.query(
      'SELECT admin_address FROM bnb_settings ORDER BY id DESC LIMIT 1'
    );

    if (!setting) {
      return res.status(404).json({ error: 'Admin settings not found' });
    }

    if (Number(wallet.real_bamount) > 0) {
      // 실제 BNB 전송 로직은 Web3 라이브러리 필요
      // 여기서는 시뮬레이션
      const txHash = `0x${Math.random().toString(16).substr(2, 64)}`;

      // 트랜잭션 로그 기록
      await db.query(
        'INSERT INTO bnb_transaction_log (from_address, to_address, amount, tx_hash, status, created_at) VALUES (?, ?, ?, ?, "SUCCESS", NOW())',
        [wallet.address, setting.admin_address, wallet.real_bamount, txHash]
      );

      res.json({ success: true, txHash, amount: wallet.real_bamount });
    } else {
      res.json({ success: true, message: 'No BNB to reclaim' });
    }
  } catch (err) {
    console.error('❌ BNB 회수 실패:', err);
    res.status(500).json({ error: 'Reclaim failed' });
  }
});

module.exports = router;