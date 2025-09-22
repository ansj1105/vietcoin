const express = require('express');
const db = require('../db');
const router = express.Router();
// 추천 코드 생성 (6자리 16진수)
function generateReferralCode() {
  return [...Array(6)]
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join('')
    .toUpperCase();
}
// 유저 조회 헬퍼
async function findUser(userId) {
  const [rows] = await db.query('SELECT id, referral_code FROM users WHERE id = ?', [userId]);
  return rows[0] || null;
}
router.get('/code-u', async (req, res) => {
  const userId = req.session.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  try {
    const [rows] = await db.query(
      'SELECT referral_code FROM users WHERE id = ?',
      [userId]
    );
    const code = rows[0]?.referral_code || null;
    res.json({ success: true, data: { referral_code: code } });
  } catch (err) {
    console.error('❌ 내 초대 코드 조회 오류:', err);
    res.status(500).json({ success: false, error: '내 초대 코드 조회 실패' });
  }
});
// GET: 특정 유저의 referral_code 조회
// GET /api/referral/code/:id
router.get('/code/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    const user = await findUser(userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: { referral_code: user.referral_code } });
  } catch (err) {
    console.error('❌ referral_code 조회 오류:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST: referral_code 생성 (존재하지 않을 때)
// POST /api/referral/code/:id
router.post('/code/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    const user = await findUser(userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    let code = user.referral_code;
    if (!code) {
      code = await generateReferralCode();
      await db.query('UPDATE users SET referral_code = ? WHERE id = ?', [code, userId]);
    }
    res.json({ success: true, data: { referral_code: code } });
  } catch (err) {
    console.error('❌ referral_code 생성 오류:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PUT: referral_code 업데이트 (관리자 등에서 직접 변경)
// PUT /api/referral/code/:id
// 관리자용: 특정 유저 레퍼럴 코드 업데이트
// PUT /api/referral/users/:id/code
router.put('/users/:id/code', async (req, res) => {
  const userId = req.params.id;
  const { referral_code } = req.body;
  // 유효성 검사: 6자리 16진수
  const pattern = /^[A-F0-9]{6}$/;
  if (!pattern.test(referral_code)) {
    return res.status(400).json({ success: false, error: 'Invalid code format' });
  }
  try {
    const user = await findUser(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    await db.query(
      'UPDATE users SET referral_code = ? WHERE id = ?',
      [referral_code, userId]
    );
    res.json({ success: true, data: { referral_code } });
  } catch (err) {
    console.error('❌ 관리자용 코드 업데이트 오류:', err);
    res.status(500).json({ success: false, error: '코드 업데이트 실패' });
  }
});

// DELETE: referral_code 삭제 (null 처리)
// DELETE /api/referral/code/:id
router.delete('/code/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    const user = await findUser(userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    await db.query('UPDATE users SET referral_code = NULL WHERE id = ?', [userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ referral_code 삭제 오류:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});


// GET / PUT /referral-settings
router.get('/reward-settings', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM referral_reward_settings LIMIT 1');
  res.json({ success: true, data: rows[0] || { levelA: 0, levelB: 0, levelC: 0 } });
});

router.put('/reward-settings', async (req, res) => {
  const { levelA, levelB, levelC } = req.body;
  const [existing] = await db.query('SELECT id FROM referral_reward_settings LIMIT 1');
  if (existing.length) {
    await db.query(
      'UPDATE referral_reward_settings SET levelA=?, levelB=?, levelC=?, updated_at=NOW() WHERE id=?',
      [levelA, levelB, levelC, existing[0].id]
    );
  } else {
    await db.query(
      'INSERT INTO referral_reward_settings(levelA,levelB,levelC) VALUES(?,?,?)',
      [levelA, levelB, levelC]
    );
  }
  res.json({ success: true });
});

// 유틸: 사용자 객체에 team_count, total_profit, last_active 추가
async function enrichUser(user) {
  const [[teamCountRow]] = await db.query(
    `SELECT COUNT(*) AS team_count FROM referral_relations WHERE referrer_id = ? AND status = 'active'`,
    [user.id]
  );
  const [[profitRow]] = await db.query(
    `SELECT IFNULL(SUM(amount), 0) AS total_profit FROM referral_rewards WHERE user_id = ?`,
    [user.id]
  );
  return {
    ...user,
    team_count: Number(teamCountRow.team_count) || 0,
    total_profit: parseFloat(profitRow.total_profit) || 0,
    last_active: user.created_at || new Date().toISOString(),
  };
}

// 보상 설정 조회
// GET /api/referral/reward-settings
router.get('/reward-settings', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT levelA, levelB, levelC FROM referral_reward_settings LIMIT 1');
    res.json({ success: true, data: rows[0] || { levelA: 0, levelB: 0, levelC: 0 } });
  } catch (err) {
    console.error('❌ 보상 설정 조회 오류:', err);
    res.status(500).json({ success: false, error: '보상 설정 조회 실패' });
  }
});

// 보상 설정 저장
// PUT /api/referral/reward-settings
router.put('/reward-settings', async (req, res) => {
  const { levelA, levelB, levelC } = req.body;
  try {
    const [existing] = await db.query('SELECT id FROM referral_reward_settings LIMIT 1');
    if (existing.length) {
      await db.query(
        'UPDATE referral_reward_settings SET levelA = ?, levelB = ?, levelC = ?, updated_at = NOW() WHERE id = ?',
        [levelA, levelB, levelC, existing[0].id]
      );
    } else {
      await db.query(
        'INSERT INTO referral_reward_settings(levelA, levelB, levelC) VALUES(?, ?, ?)',
        [levelA, levelB, levelC]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error('❌ 보상 설정 저장 오류:', err);
    res.status(500).json({ success: false, error: '보상 설정 저장 실패' });
  }
});

// 특정 사용자 추천 네트워크 조회
// GET /api/referral/users/:id/my-team
router.get('/users/:id/my-team', async (req, res) => {
  const userId = req.params.id;
  try {
    const [rows] = await db.query('SELECT referrer_id FROM users WHERE id = ?', [userId]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'User not found' });
    let S = null;
    if (rows[0].referrer_id) {
      const [refRows] = await db.query('SELECT id, name, email FROM users WHERE id = ?', [rows[0].referrer_id]);
      if (refRows.length) S = refRows[0];
    }
    const [Araw] = await db.query(
      'SELECT id, name, email, vip_level, created_at FROM users WHERE referrer_id = ? AND referral_level = 2',
      [userId]
    );
    const A = await Promise.all(Araw.map(enrichUser));
    const A_ids = A.map(u => u.id);
    const [Braw] = A_ids.length
      ? await db.query(
        'SELECT id, name, email, vip_level, created_at FROM users WHERE referrer_id IN (?) AND referral_level = 3',
        [A_ids]
      )
      : [[]];
    const B = await Promise.all(Braw.map(enrichUser));
    const B_ids = B.map(u => u.id);
    const [Craw] = B_ids.length
      ? await db.query(
        'SELECT id, name, email, vip_level, created_at FROM users WHERE referrer_id IN (?) AND referral_level = 4',
        [B_ids]
      )
      : [[]];
    const C = await Promise.all(Craw.map(enrichUser));
    res.json({ success: true, data: { S, A, B, C } });
  } catch (err) {
    console.error('❌ 팀 조회 오류:', err);
    res.status(500).json({ success: false, error: '내 팀 조회 실패' });
  }
});



// 관리자용: 특정 유저 초대 코드 생성/조회
// POST /api/referral/users/:id/invitation-code
router.post('/users/:id/invitation-code', async (req, res) => {
  const userId = req.params.id;
  try {
    const user = await findUser(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    let code = user.referral_code;
    if (!code) {
      // crypto.randomBytes 대신 generateReferralCode 사용
      code = await generateReferralCode();
      await db.query(
        'UPDATE users SET referral_code = ? WHERE id = ?',
        [code, userId]
      );
    }
    res.json({ success: true, data: { referral_code: code } });
  } catch (err) {
    console.error('❌ 관리자용 초대 코드 생성 오류:', err);
    res.status(500).json({ success: false, error: '초대 코드 생성 실패' });
  }
});

// 관리자가 특정 유저의 내 초대 코드 조회
// GET /api/referral/users/:id/code
router.get('/users/:id/code', async (req, res) => {
  const userId = req.params.id;
  try {
    const [rows] = await db.query(
      'SELECT referral_code FROM users WHERE id = ?',
      [userId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, data: { referral_code: rows[0].referral_code || null } });
  } catch (err) {
    console.error('❌ 관리자용 코드 조회 오류:', err);
    res.status(500).json({ success: false, error: '관리자용 코드 조회 실패' });
  }
});

// 관리자가 특정 유저의 초대 코드 생성/재생성
// POST /api/referral/users/:id/code
router.post('/users/:id/code', async (req, res) => {
  const userId = req.params.id;
  try {
    const user = await findUser(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    let code = user.referral_code;
    if (!code) {
      // crypto.randomBytes 대신 generateReferralCode 사용
      code = await generateReferralCode();
      await db.query(
        'UPDATE users SET referral_code = ? WHERE id = ?',
        [code, userId]
      );
    }
    res.json({ success: true, data: { referral_code: code } });
  } catch (err) {
    console.error('❌ 관리자용 초대 코드 생성 오류:', err);
    res.status(500).json({ success: false, error: '초대 코드 생성 실패' });
  }
});

// 관리자가 특정 유저의 초대 현황 조회
// GET /api/referral/users/:id/invitation-status
router.get('/users/:id/invitation-status', async (req, res) => {
  const userId = req.params.id;
  try {
    const [rows] = await db.query(
      'SELECT referral_code FROM users WHERE id = ?',
      [userId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const code = rows[0].referral_code;
    const [invites] = await db.query(
      'SELECT id, name, email, created_at AS invited_at FROM users WHERE referrer_id = ?',
      [userId]
    );
    res.json({ success: true, data: { referral_code: code, total_invites: invites.length, invites } });
  } catch (err) {
    console.error('❌ 관리자용 초대 현황 조회 오류:', err);
    res.status(500).json({ success: false, error: '관리자용 초대 현황 조회 실패' });
  }
});

// 모든 사용자에 대한 레퍼럴 네트워크 조회
// GET /api/referral/users/all/my-teams
router.get('/users/all/my-teams', async (req, res) => {
  try {
    const [userIds] = await db.query('SELECT id FROM users');
    const results = await Promise.all(userIds.map(async ({ id }) => {
      const [[meRow]] = await db.query(
        'SELECT id,name,email,vip_level,created_at FROM users WHERE id = ?',
        [id]
      );
      const S = await enrichUser(meRow);

      const [Araw] = await db.query(
        'SELECT id,name,email,vip_level,created_at FROM users WHERE referrer_id = ? AND referral_level = 2',
        [id]
      );
      const A = await Promise.all(Araw.map(enrichUser));
      const A_ids = A.map(u => u.id);

      const [Braw] = A_ids.length
        ? await db.query(
          'SELECT id,name,email,vip_level,created_at FROM users WHERE referrer_id IN (?) AND referral_level = 3',
          [A_ids]
        )
        : [[]];
      const B = await Promise.all(Braw.map(enrichUser));
      const B_ids = B.map(u => u.id);

      const [Craw] = B_ids.length
        ? await db.query(
          'SELECT id,name,email,vip_level,created_at FROM users WHERE referrer_id IN (?) AND referral_level = 4',
          [B_ids]
        )
        : [[]];
      const C = await Promise.all(Craw.map(enrichUser));

      return { S, A, B, C };
    }));
    res.json({ success: true, data: results });
  } catch (err) {
    console.error('❌ 전체 팀 조회 오류:', err);
    res.status(500).json({ success: false, error: '전체 팀 조회 실패' });
  }
});
// ✅ 전체 유저 목록 기반으로 팀 구성 조회 + 계층 분리

// ✅ 관리자용 팀 구조 전체 조회
router.get("/admin/my-team", async (req, res) => {
  try {
    const enrichUser = async (id) => {
      try {
        const [[u]] = await db.query(`SELECT id,name,email,vip_level,created_at FROM users WHERE id = ?`, [id]);
        if (!u) {
          console.warn(`User not found with id: ${id}`);
          return null;
        }

        const [[{ team_count }]] = await db.query(`SELECT COUNT(*) AS team_count FROM referral_relations WHERE referrer_id = ? AND status='active'`, [id]);
        const [[{ total_profit }]] = await db.query(`SELECT IFNULL(SUM(amount),0) AS total_profit FROM referral_rewards WHERE user_id = ?`, [id]);

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          vip_level: u.vip_level,
          created_at: u.created_at,
          team_count: Number(team_count),
          total_profit: parseFloat(total_profit),
          last_active: u.created_at
        };
      } catch (err) {
        console.error(`Error enriching user ${id}:`, err);
        return null;
      }
    };

    const [userIds] = await db.query(`SELECT id FROM users`);

    const teams = await Promise.all(userIds.map(async ({ id }) => {
      const S = await enrichUser(id);
      if (!S) {
        return null; // 사용자가 없으면 null 반환
      }

      const [relations] = await db.query(
        `SELECT referred_id, level FROM referral_relations
         WHERE referrer_id = ? AND status = 'active'`,
        [id]
      );

      const A_ids = relations.filter(r => r.level === 1).map(r => r.referred_id);
      const B_ids = relations.filter(r => r.level === 2).map(r => r.referred_id);
      const C_ids = relations.filter(r => r.level === 3).map(r => r.referred_id);

      const A = A_ids.length ? (await Promise.all(A_ids.map(enrichUser))).filter(user => user !== null) : [];
      const B = B_ids.length ? (await Promise.all(B_ids.map(enrichUser))).filter(user => user !== null) : [];
      const C = C_ids.length ? (await Promise.all(C_ids.map(enrichUser))).filter(user => user !== null) : [];

      return { S, A, B, C };
    }));

    // null 값들 필터링
    const validTeams = teams.filter(team => team !== null);

    res.json({ success: true, data: validTeams });
  } catch (err) {
    console.error('❌ 관리자용 팀 조회 오류:', err);
    res.status(500).json({ success: false, error: 'Admin team fetch failed' });
  }
});

// ✅ 추천 팀 구조 조회 API
router.get('/my-team', async (req, res) => {
  const userId = req.session.user?.id;
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const enrichUser = async (id) => {
    const [[u]] = await db.query(`SELECT id,name,email,vip_level,created_at FROM users WHERE id=?`, [id]);
    const [[{ team_count }]] = await db.query(`SELECT COUNT(*) AS team_count FROM referral_relations WHERE referrer_id=? AND status='active'`, [id]);
    const [[{ total_profit }]] = await db.query(`SELECT IFNULL(SUM(amount),0) AS total_profit FROM referral_rewards WHERE user_id=?`, [id]);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      vip_level: u.vip_level,
      created_at: u.created_at,
      team_count: Number(team_count),
      total_profit: parseFloat(total_profit),
      last_active: u.created_at,
    };
  };

  try {
    const S = await enrichUser(userId);

    // 전체 하위 관계에서 level에 따라 분기
    const [relations] = await db.query(`
      SELECT referred_id, level FROM referral_relations
      WHERE referrer_id = ? AND status = 'active'
    `, [userId]);

    const A_ids = relations.filter(r => r.level === 1).map(r => r.referred_id);
    const B_ids = relations.filter(r => r.level === 2).map(r => r.referred_id);
    const C_ids = relations.filter(r => r.level === 3).map(r => r.referred_id);

    const A = A_ids.length ? await Promise.all(A_ids.map(id => enrichUser(id))) : [];
    const B = B_ids.length ? await Promise.all(B_ids.map(id => enrichUser(id))) : [];
    const C = C_ids.length ? await Promise.all(C_ids.map(id => enrichUser(id))) : [];

    res.json({ success: true, data: { S, A, B, C } });
  } catch (err) {
    console.error('❌ 팀 조회 오류:', err);
    res.status(500).json({ success: false, error: '내 팀 조회 실패' });
  }
});

// 📁 routes/referral.js (또는 stats를 정의한 파일)
router.get('/stats', async (req, res) => {
  const userId = req.session.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const [[stats]] = await db.query(`
      SELECT
        -- 1) 전체 팀원 수
        (SELECT COUNT(*) 
           FROM referral_relations 
          WHERE referrer_id = ? 
            AND status = 'active') AS totalMembers,

        -- 2) 오늘 가입한 팀원 수
        (SELECT COUNT(*) 
           FROM referral_relations 
          WHERE referrer_id = ? 
            AND status = 'active' 
            AND DATE(created_at) = CURDATE()) AS todayJoined,

        -- 3) 전체 정량 수익 (quant_profits + wallets_log)
        (
          SELECT IFNULL(SUM(amount),0) FROM quant_profits WHERE user_id = ?
        ) + (
          SELECT IFNULL(SUM(amount),0) FROM wallets_log WHERE user_id = ? AND (reference_type = 'invite_rewards' OR reference_type = 'join_rewards')
        ) AS totalProfit,

        -- 4) 오늘 정량 수익 (quant_profits + wallets_log)
        (
          SELECT IFNULL(SUM(amount),0) FROM quant_profits WHERE user_id = ? AND DATE(created_at) = CURDATE()
        ) + (
          SELECT IFNULL(SUM(amount),0) FROM wallets_log WHERE user_id = ? AND (reference_type = 'invite_rewards' OR reference_type = 'join_rewards') AND DATE(log_date) = CURDATE()
        ) AS todayProfit
    `, [userId, userId, userId, userId, userId, userId, userId, userId]);

    res.json({ success: true, data: stats });
  } catch (err) {
    console.error("❌ 통계 조회 실패:", err);
    res.status(500).json({ error: "통계 조회 실패" });
  }
});


// Query params: ?period=today|week|month

router.get('/contributions', async (req, res) => {
  const userId = req.session.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  // period 파라미터에 따른 날짜 조건
  let dateCondition = '';
  if (req.query.period === 'today') {
    dateCondition = `AND DATE(qp.created_at) = CURDATE()`;
  } else if (req.query.period === 'week') {
    dateCondition = `AND YEARWEEK(qp.created_at, 1) = YEARWEEK(CURDATE(), 1)`;
  } else if (req.query.period === 'month') {
    dateCondition = `
      AND MONTH(qp.created_at) = MONTH(CURDATE())
      AND YEAR(qp.created_at )= YEAR(CURDATE())
    `;
  }

  try {
    // 1) 전체/오늘 referral 수익 합계
    const [[statsRow]] = await db.query(
      `
      SELECT
        IFNULL(SUM(qp.amount), 0) AS totalEarnings,
        IFNULL(SUM(
          CASE WHEN DATE(qp.created_at)=CURDATE() THEN qp.amount ELSE 0 END
        ), 0)               AS todayEarnings
      FROM quant_profits qp
      WHERE qp.user_id = ?            -- 이 유저가 referrer
        AND qp.type = 'referral'
        ${dateCondition}
      `,
      [userId]
    );

    // 2) 상세 리스트: 같은 trade_id 의 trade 행을 찾아 실제 거래자(tp.user_id)를 꺼냄
    const [rows] = await db.query(
      `
      SELECT
        u.name        AS userName,    -- 실제 하위 유저
        CASE qp.level WHEN 1 THEN 'A'
                       WHEN 2 THEN 'B'
                       WHEN 3 THEN 'C' END AS levelLabel,
        qp.created_at AS time,
        qp.amount     AS earning
      FROM quant_profits qp

      -- 같은 거래에서 발생한 trade 수익 행(tp.type='trade') 조인
      JOIN quant_profits tp
        ON tp.trade_id = qp.trade_id
       AND tp.type     = 'trade'

      JOIN users u
        ON u.id        = tp.user_id

      WHERE qp.user_id = ?
        AND qp.type    = 'referral'
        ${dateCondition}

      ORDER BY qp.created_at DESC
      LIMIT 100
      `,
      [userId, userId]
    );

    res.json({
      success: true,
      stats: {
        totalEarnings: parseFloat(statsRow.totalEarnings),
        todayEarnings: parseFloat(statsRow.todayEarnings)
      },
      list: rows.map(r => ({
        user_name: r.userName,
        level: r.levelLabel,
        time: r.time,
        earning: parseFloat(r.earning)
      }))
    });
  } catch (err) {
    console.error('❌ contributions API error:', err.message);
    if (err.sql) console.error('  SQL was:', err.sql);
    res.status(500).json({ error: 'Failed to load contributions' });
  }
});


module.exports = router;
