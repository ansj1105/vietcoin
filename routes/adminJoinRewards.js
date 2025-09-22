// 📁 routes/adminJoinRewards.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// ── 규칙 조회
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM join_rewards ORDER BY id');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('❌ adminJoinRewards 규칙 조회 실패:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch join rewards' });
  }
});

// ── 규칙 추가
router.post('/', async (req, res) => {
  try {
    const { amount, required_balance } = req.body;
    await db.query(
      'INSERT INTO join_rewards (amount, required_balance) VALUES (?, ?)',
      [amount, required_balance]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('❌ adminJoinRewards 규칙 추가 실패:', err);
    res.status(500).json({ success: false, error: 'Failed to add join reward' });
  }
});

// ── 규칙 수정
router.put('/:id', async (req, res) => {
  try {
    const { amount, required_balance } = req.body;
    await db.query(
      'UPDATE join_rewards SET amount=?, required_balance=? WHERE id=?',
      [amount, required_balance, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('❌ adminJoinRewards 규칙 수정 실패:', err);
    res.status(500).json({ success: false, error: 'Failed to update join reward' });
  }
});

// ── 규칙 삭제
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM join_rewards WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ adminJoinRewards 규칙 삭제 실패:', err);
    res.status(500).json({ success: false, error: 'Failed to delete join reward' });
  }
});

// ── 수령 내역 조회
router.get('/claims', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT ujr.id,
             ujr.user_id,
             u.email as user_email,
             ujr.join_reward_id,
             jr.amount,
             jr.required_balance,
             ujr.claimed,
             ujr.claimed_at as created_at,
             CASE 
               WHEN ujr.claimed = 1 THEN 'approved'
               ELSE 'pending'
             END as status
        FROM user_join_rewards ujr
        JOIN users u  ON u.id = ujr.user_id
        JOIN join_rewards jr ON jr.id = ujr.join_reward_id
       ORDER BY ujr.claimed_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('❌ adminJoinRewards 수령 내역 조회 실패:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch join reward claims' });
  }
});

module.exports = router;
