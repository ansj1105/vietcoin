const express = require('express');
const router = express.Router();
const TronWeb = require('tronweb');
const axios = require('axios');
const db = require('../db');
require('dotenv').config();
const { getTronWeb, USDT_CONTRACT } = require("../utils/tron");

// ▶ 1. 지갑 생성
// GET /api/tron/create-wallet
router.get('/create-wallet', async (req, res) => {
  try {
    const tronWeb = getTronWeb();
    const account = await tronWeb.createAccount();
    // 로그만 남기고 실제 저장은 필요에 따라 변경하세요
    await db.query(
      'INSERT INTO wallet_log (address, private_key) VALUES (?, ?)',
      [account.address.base58, account.privateKey]
    );
    res.json({ success: true, address: account.address.base58, privateKey: account.privateKey });
  } catch (err) {
    console.error('❌ 지갑 생성 실패:', err);
    res.status(500).json({ success: false, error: 'Wallet creation failed' });
  }
});
// 📁 routes/tron.js (기존 파일에 이어 붙이세요)
router.get('/create-wallet/logs', async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, address, private_key, created_at
         FROM wallet_log
       ORDER BY created_at DESC`
    );
    res.json({ data: rows });
  } catch (err) {
    console.error('❌ /create-wallet/logs 조회 실패:', err);
    res.status(500).json({ error: 'Failed to fetch wallet logs' });
  }
});

// ▶ 2. 잔액 조회 (Tronscan API 활용)
// GET /api/tron/balance?address=...
router.get('/balance', async (req, res) => {
  const address = (req.query.address || '').trim();
  if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address)) {
    return res.status(400).json({ success: false, error: 'Invalid TRON address' });
  }
  try {
    const response = await axios.get('https://apilist.tronscanapi.com/api/accountv2', {
      params: { address },
      headers: { 'TRON-PRO-API-KEY': process.env.TRON_API_KEY2 }
    });
    const usdtAsset = response.data.withPriceTokens?.find(
      t => t.tokenId === USDT_CONTRACT
    );
    const usdt = usdtAsset ? Number(usdtAsset.balance) / 1e6 : 0;
    // 옵션: 잔액 기록
    await db.query('INSERT INTO balance_log (address, balance_usdt) VALUES (?, ?)', [
      address, usdt
    ]);
    res.json({ success: true, usdt: usdt.toFixed(6) });
  } catch (err) {
    console.error('❌ 잔액 조회 실패:', err.message);
    res.status(500).json({ success: false, error: 'Balance check failed' });
  }
});


/**
 * ▶ TRX 잔액 조회
 * GET /api/tron/balance-trx?address=<TRON 주소>
 */
router.get('/balance-trx', async (req, res) => {
  const address = (req.query.address || '').trim();
  // 간단한 형식 검사
  if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address)) {
    return res.status(400).json({ success: false, error: 'Invalid TRON address' });
  }

  try {
    const tronWeb = getTronWeb();
    // Sun 단위로 잔액 조회
    const sunBalance = await tronWeb.trx.getBalance(address);
    // TRX 로 변환
    const trxBalance = tronWeb.fromSun(sunBalance);

    // (선택) DB에 기록
    await db.query(
      `INSERT INTO balance_log 
         (address, balance_usdt, balance_trx, created_at)
       VALUES (?, NULL, ?, NOW())`,
      [address, trxBalance]
    );

    return res.json({ success: true, trx: Number(trxBalance).toFixed(6) });
  } catch (err) {
    console.error('❌ TRX 잔액 조회 실패:', err.message);
    return res.status(500).json({ success: false, error: 'TRX balance check failed' });
  }
});
// 📁 routes/tron.js (기존 파일에 이어 붙이세요)
router.post('/send-trx', async (req, res) => {
  const { fromPrivateKey, toAddress, amount } = req.body;
  if (!fromPrivateKey || !toAddress || !amount) {
    return res.status(400).json({ success: false, error: 'Missing parameters' });
  }

  try {
    const tronWeb = getTronWeb(fromPrivateKey);
    // 주소 유효성 검사
    if (!tronWeb.isAddress(toAddress)) {
      return res.status(400).json({ success: false, error: 'Invalid toAddress' });
    }
    const fromAddress = tronWeb.address.fromPrivateKey(fromPrivateKey);
    // Sun 단위로 변환 (1 TRX = 10^6 Sun)
    const sunAmount = tronWeb.toSun(amount);

    // 1) 트랜잭션 생성 및 전송
    const tx = await tronWeb.trx.sendTransaction(
      toAddress,
      sunAmount,
      fromPrivateKey
    );
    if (tx.result !== true && !tx.txid) {
      throw new Error(`Send failed: ${JSON.stringify(tx)}`);
    }
    const txHash = tx.txid || tx;

    // 2) DB에 기록
    await db.query(
      `INSERT INTO transaction_log
         (from_address, to_address, amount_usdt, amount_trx, tx_hash, status, created_at)
       VALUES (?, ?, NULL, ?, ?, 'SUCCESS', NOW())`,
      [fromAddress, toAddress, amount, txHash]
    );

    res.json({ success: true, txHash });
  } catch (err) {
    console.error('❌ TRX 송금 실패:', err.message);
    // 실패 로그
    try {
      await db.query(
        `INSERT INTO transaction_log
           (from_address, to_address, amount_usdt, amount_trx, status, reason, created_at)
         VALUES (?, ?, NULL, ?, 'FAILED', ?, NOW())`,
        ['unknown', req.body.toAddress, req.body.amount, err.message]
      );
    } catch (logErr) {
      console.error('❌ 실패 로그 기록 오류:', logErr);
    }
    res.status(500).json({ success: false, error: 'TRX transfer failed' });
  }
});

// ▶ 3. USDT 송금
// POST /api/tron/send
// body: { fromPrivateKey, toAddress, amount }
router.post('/send', async (req, res) => {
  const { fromPrivateKey, toAddress, amount } = req.body;
  if (!fromPrivateKey || !toAddress || !amount) {
    return res.status(400).json({ success: false, error: 'Missing parameters' });
  }
  try {
    const tronWeb = getTronWeb(fromPrivateKey);
    if (!tronWeb.isAddress(toAddress)) {
      return res.status(400).json({ success: false, error: 'Invalid toAddress' });
    }
    const contract = await tronWeb.contract().at(USDT_CONTRACT);
    const tx = await contract.methods.transfer(toAddress, Math.floor(amount * 1e6)).send();
    const fromAddress = tronWeb.address.fromPrivateKey(fromPrivateKey);
    // DB에 기록
    await db.query(
      'INSERT INTO transaction_log (from_address, to_address, amount_usdt, tx_hash, status) VALUES (?, ?, ?, ?, ?)',
      [fromAddress, toAddress, amount, tx, 'SUCCESS']
    );
    res.json({ success: true, txHash: tx });
  } catch (err) {
    console.error('❌ 송금 실패:', err.message);
    // 실패 로그
    await db.query(
      'INSERT INTO transaction_log (from_address, to_address, amount_usdt, status, reason) VALUES (?, ?, ?, ?, ?)',
      ['unknown', req.body.toAddress, req.body.amount, 'FAILED', err.message]
    );
    res.status(500).json({ success: false, error: 'Transfer failed' });
  }
});

// ▶ 4. 트랜잭션 로그 조회
// GET /api/tron/transactions
router.get('/transactions', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM transaction_log ORDER BY created_at DESC LIMIT 100'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('❌ 트랜잭션 로그 조회 실패:', err);
    res.status(500).json({ success: false, error: 'Fetch transactions failed' });
  }
});

async function getTronBalance(address) {
  if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address)) {
    throw new Error('Invalid TRON address');
  }
  const response = await axios.get('https://apilist.tronscanapi.com/api/accountv2', {
    params: { address },
    headers: { 'TRON-PRO-API-KEY': process.env.TRON_API_KEY2 }
  });
  const usdtAsset = response.data.withPriceTokens?.find(t => t.tokenId === USDT_CONTRACT);
  return usdtAsset ? Number(usdtAsset.balance) / 1e6 : 0;
}

// ▶ 5. 자금 회수 (리팩토링)
router.post('/reclaim-funds', async (req, res) => {
  try {
    // 1) 프론트에서 임계치, 관리자 주소, 관리자 프라이빗키, 송금할 TRX 수량을 전달받음
    const { threshold, admin_address, admin_private_key, fund_trx_amount } = req.body;
    if (!threshold || !admin_address || !admin_private_key || !fund_trx_amount) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }
    // 2) 회수 대상 지갑 조회
    const [targets] = await db.query(
      'SELECT id, user_id, address, private_key, real_amount FROM wallets WHERE real_amount >= ?',
      [threshold]
    );
    const results = [];
    // 3) 관리자 지갑에서 각 대상 지갑으로 fund_trx_amount 송금
    const TronWeb = require('tronweb');
    const adminTronWeb = new TronWeb({
      fullHost: 'https://api.trongrid.io',
      privateKey: admin_private_key
    });
    for (const w of targets) {
      let fundTxHash = null;
      let fundError = null;
      let reclaimTxHash = null;
      let reclaimError = null;
      // 3-1) 관리자 → 대상 지갑으로 TRX 송금
      try {
        const sunAmount = adminTronWeb.toSun(fund_trx_amount);
        const fundTx = await adminTronWeb.trx.sendTransaction(w.address, sunAmount, admin_private_key);
        fundTxHash = fundTx.txid || (fundTx.result === true && fundTx.txid);
        if (!fundTxHash) throw new Error('TRX funding failed');
      } catch (err) {
        fundError = err.message;
      }
      // 3-2) 대상 지갑 → 관리자 주소로 real_amount 송금
      if (!fundError) {
        try {
          // 대상 지갑에 송금이 반영될 때까지 약간 대기(네트워크 반영)
          await new Promise(r => setTimeout(r, 3000));
          const userTronWeb = new TronWeb({
            fullHost: 'https://api.trongrid.io',
            privateKey: w.private_key
          });
          const sunAmount = userTronWeb.toSun(w.real_amount);
          const reclaimTx = await userTronWeb.trx.sendTransaction(admin_address, sunAmount, w.private_key);
          reclaimTxHash = reclaimTx.txid || (reclaimTx.result === true && reclaimTx.txid);
          if (!reclaimTxHash) throw new Error('Reclaim transfer failed');
          // 회수 성공 시 DB 업데이트
          await db.query('UPDATE wallets SET real_amount = 0, updated_at = NOW() WHERE id = ?', [w.id]);
          await db.query(
            `INSERT INTO wallets_log
               (user_id, category, log_date, direction, amount, balance_after,
                reference_type, reference_id, description, created_at)
             VALUES (?, 'reclaim', NOW(), 'out', ?, 0, 'reclaim', ?, ?, NOW())`,
            [w.user_id, w.real_amount, w.id, `Reclaimed ${w.real_amount} from ${w.address}`]
          );
          await db.query(
            `INSERT INTO transaction_log
               (from_address, to_address, amount_usdt, amount_trx, tx_hash, status, created_at)
             VALUES (?, ?, NULL, ?, ?, 'SUCCESS', NOW())`,
            [w.address, admin_address, w.real_amount, reclaimTxHash]
          );
        } catch (err) {
          reclaimError = err.message;
        }
      }
      results.push({
        wallet_id: w.id,
        address: w.address,
        real_amount: w.real_amount,
        fundTxHash,
        fundError,
        reclaimTxHash,
        reclaimError
      });
    }
    return res.json({ success: true, threshold, admin_address, results });
  } catch (err) {
    console.error('❌ /reclaim-funds error:', err);
    return res.status(500).json({ success: false, error: 'Reclaim process failed' });
  }
});

// ▶ 관리자→지갑 TRX 충전 (reclaim_settings 기준으로)
router.post('/fund-wallet', async (req, res) => {
  const { toAddress, amount } = req.body;
  if (!toAddress || !amount) {
    return res.status(400).json({ success: false, error: 'Missing parameters' });
  }

  try {
    // 1) reclaim_settings 에서 admin 주소/키 조회
    const [[setting]] = await db.query(
      'SELECT admin_address, admin_private_key FROM reclaim_settings ORDER BY id DESC LIMIT 1'
    );
    const adminAddr = setting.admin_address;
    const adminKey = setting.admin_private_key;

    // 2) 주소 유효성 검사
    const tronWeb = getTronWeb(adminKey);
    if (!tronWeb.isAddress(toAddress)) {
      return res.status(400).json({ success: false, error: 'Invalid toAddress' });
    }

    // 3) 전송
    const sunAmount = tronWeb.toSun(amount);
    const tx = await tronWeb.trx.sendTransaction(toAddress, sunAmount, adminKey);
    const txHash = tx.txid || (tx.result === true && tx.txid);
    if (!txHash) throw new Error('Transfer failed');

    // 4) transaction_log 기록
    await db.query(
      `INSERT INTO transaction_log
         (from_address, to_address, amount_usdt, amount_trx, tx_hash, status, created_at)
       VALUES (?, ?, NULL, ?, ?, 'SUCCESS', NOW())`,
      [adminAddr, toAddress, amount, txHash]
    );

    return res.json({ success: true, txHash });
  } catch (err) {
    console.error('❌ 관리자 충전 실패:', err.message);
    return res.status(500).json({ success: false, error: 'Funding failed' });
  }
});

router.post('/reclaim-settings', async (req, res) => {
  const { admin_address, admin_private_key, threshold } = req.body;
  if (!admin_address || !admin_private_key || !threshold) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  try {
    await db.query(
      'INSERT INTO reclaim_settings (admin_address, admin_private_key, threshold) VALUES (?, ?, ?)',
      [admin_address, admin_private_key, threshold]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save reclaim settings' });
  }
});
router.get('/reclaim-settings', async (req, res) => {
  try {
    const [[row]] = await db.query(
      'SELECT admin_address, threshold FROM reclaim_settings ORDER BY id DESC LIMIT 1'
    );
    res.json(row || {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reclaim settings' });
  }
});
// ========== 관리자용 Tron API ==========

// 지갑 목록 조회
router.get('/admin/wallets', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, address, private_key, updated_at
      FROM wallets 
      WHERE address IS NOT NULL
      ORDER BY updated_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ Tron 지갑 목록 조회 실패:', err);
    res.status(500).json({ error: 'Failed to fetch wallets' });
  }
});

// 관리자 설정 조회
router.get('/admin/settings', async (req, res) => {
  try {
    const [[row]] = await db.query(
      'SELECT admin_address, threshold FROM reclaim_settings ORDER BY id DESC LIMIT 1'
    );
    res.json(row || {});
  } catch (err) {
    console.error('❌ 관리자 설정 조회 실패:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// TRX 잔액 조회
router.get('/admin/balance/:address/trx', async (req, res) => {
  try {
    const { address } = req.params;
    const tronWeb = getTronWeb();
    const sunBalance = await tronWeb.trx.getBalance(address);
    const trxBalance = tronWeb.fromSun(sunBalance);
    res.json({ balance: Number(trxBalance) });
  } catch (err) {
    console.error('❌ TRX 잔액 조회 실패:', err);
    res.status(500).json({ error: 'Failed to fetch TRX balance' });
  }
});

// USDT 잔액 조회
router.get('/admin/balance/:address/usdt', async (req, res) => {
  try {
    const { address } = req.params;
    const usdtBalance = await getTronBalance(address);
    res.json({ balance: usdtBalance });
  } catch (err) {
    console.error('❌ USDT 잔액 조회 실패:', err);
    res.status(500).json({ error: 'Failed to fetch USDT balance' });
  }
});

// 지갑 생성
router.post('/admin/create-wallet', async (req, res) => {
  try {
    const tronWeb = getTronWeb();
    const account = tronWeb.utils.accounts.generateAccount();

    // 관리자용 지갑은 별도 테이블에 저장하거나, 기존 지갑을 업데이트
    // 먼저 기존 관리자 지갑이 있는지 확인
    const [existingWallets] = await db.query(
      'SELECT id FROM wallets WHERE user_id = 1'
    );

    if (existingWallets.length > 0) {
      // 기존 지갑이 있으면 업데이트
      await db.query(
        'UPDATE wallets SET address = ?, private_key = ?, updated_at = NOW() WHERE user_id = 1',
        [account.address.base58, account.privateKey]
      );
    } else {
      // 기존 지갑이 없으면 새로 생성
      await db.query(
        'INSERT INTO wallets (user_id, address, private_key, quant_balance, fund_balance, updated_at) VALUES (1, ?, ?, 0, 0, NOW())',
        [account.address.base58, account.privateKey]
      );
    }

    res.json({
      address: account.address.base58,
      privateKey: account.privateKey
    });
  } catch (err) {
    console.error('❌ 지갑 생성 실패:', err);
    res.status(500).json({ error: 'Failed to create wallet' });
  }
});

// 전송
router.post('/admin/transfer', async (req, res) => {
  try {
    const { from_wallet_id, to_address, amount, type } = req.body;

    // 지갑 정보 조회
    const [[wallet]] = await db.query(
      'SELECT address, private_key FROM wallets WHERE id = ?',
      [from_wallet_id]
    );

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const tronWeb = getTronWeb(wallet.private_key);

    if (type === 'trx') {
      // TRX 전송
      const sunAmount = tronWeb.toSun(amount);
      const tx = await tronWeb.trx.sendTransaction(to_address, sunAmount);

      // 트랜잭션 로그 기록
      await db.query(
        'INSERT INTO transaction_log (from_address, to_address, amount_trx, tx_hash, status, created_at) VALUES (?, ?, ?, ?, "SUCCESS", NOW())',
        [wallet.address, to_address, amount, tx.txid]
      );

      res.json({ success: true, txHash: tx.txid });
    } else if (type === 'usdt') {
      // USDT 전송 (구현 필요)
      res.json({ success: false, message: 'USDT transfer not implemented yet' });
    } else {
      res.status(400).json({ error: 'Invalid transfer type' });
    }
  } catch (err) {
    console.error('❌ 전송 실패:', err);
    res.status(500).json({ error: 'Transfer failed' });
  }
});

// 트랜잭션 내역 조회
router.get('/admin/transactions', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        tl.id,
        tl.from_address,
        tl.to_address,
        tl.amount_trx,
        tl.amount_usdt,
        tl.tx_hash,
        tl.status,
        tl.created_at,
        CASE 
          WHEN tl.from_address IN (SELECT address FROM wallets WHERE address IS NOT NULL) THEN 'send'
          ELSE 'receive'
        END as type,
        CASE 
          WHEN tl.amount_trx IS NOT NULL THEN tl.amount_trx
          ELSE tl.amount_usdt
        END as amount,
        CASE 
          WHEN tl.amount_trx IS NOT NULL THEN 'TRX'
          ELSE 'USDT'
        END as currency
      FROM transaction_log tl
      WHERE tl.from_address IN (SELECT address FROM wallets WHERE address IS NOT NULL)
         OR tl.to_address IN (SELECT address FROM wallets WHERE address IS NOT NULL)
      ORDER BY tl.created_at DESC
      LIMIT 100
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ 트랜잭션 내역 조회 실패:', err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// 회수
router.post('/admin/reclaim', async (req, res) => {
  try {
    const { wallet_id } = req.body;

    // 지갑 정보 조회
    const [[wallet]] = await db.query(
      'SELECT address, private_key FROM wallets WHERE id = ?',
      [wallet_id]
    );

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // 관리자 설정 조회
    const [[setting]] = await db.query(
      'SELECT admin_address, admin_private_key FROM reclaim_settings ORDER BY id DESC LIMIT 1'
    );

    if (!setting) {
      return res.status(404).json({ error: 'Admin settings not found' });
    }

    const tronWeb = getTronWeb(wallet.private_key);

    // TRX 잔액 조회
    const sunBalance = await tronWeb.trx.getBalance(wallet.address);
    const trxBalance = tronWeb.fromSun(sunBalance);

    if (Number(trxBalance) > 0) {
      // TRX 전송
      const tx = await tronWeb.trx.sendTransaction(setting.admin_address, sunBalance);

      // 트랜잭션 로그 기록
      await db.query(
        'INSERT INTO transaction_log (from_address, to_address, amount_trx, tx_hash, status, created_at) VALUES (?, ?, ?, ?, "SUCCESS", NOW())',
        [wallet.address, setting.admin_address, trxBalance, tx.txid]
      );

      res.json({ success: true, txHash: tx.txid, amount: trxBalance });
    } else {
      res.json({ success: true, message: 'No TRX to reclaim' });
    }
  } catch (err) {
    console.error('❌ 회수 실패:', err);
    res.status(500).json({ error: 'Reclaim failed' });
  }
});

module.exports = {
  router,
  getTronBalance
};