const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 5000;

// ── 미들웨어 ─────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── SQLite 댓글 DB 초기화 ─────────────────────────────────────────────
const db = new Database(path.join(__dirname, 'comments.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS comments (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    vid     TEXT NOT NULL,
    author  TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  )
`);

// ── VOL_DATA (data.php와 동일 구조) ───────────────────────────────────
const VOL_DATA = [
  {
    vid: 'vol1',
    title: '2025년 12월호 (창간호)',
    date: '2025년 12월호',
    tags: ['#창간', '#기드온', '#항아리'],
    summary: '기드온 300용사: 시선의 전환.',
    cover: '/covers/1.jpg',
    thumb: '/thumbs/vol1.jpg',
    pages: [
      '1 (1).jpg', '1 (2).jpg', '1 (3).jpg', '1 (4).jpg', '1 (5).jpg',
      '1 (6).jpg', '1 (7).jpg', '1 (8).jpg', '1 (9).jpg', '1 (10).jpg',
      '1 (11).jpg', '1 (12).jpg', '1 (13).jpg', '1 (14).jpg', '1 (15).jpg'
    ],
    pageDir: 'vol1',
    bgm: '/bgm/vol1.mp3',
    page_audios: {
      0: { src: '/audios/vol1.mp3', title: '항아리를 깨뜨려라' },
      15: { src: '/audios/vol1-2.mp3', title: '두 번째 이야기' },
      20: { src: '/audios/vol1-3.mp3', title: '세 번째' }
    }
  },
  {
    vid: 'vol2',
    title: '2026년 1월호 (신년호)',
    date: '2026년 1월호',
    tags: ['#신년', '#결심', '#구별'],
    summary: '세상과 구별.',
    cover: '/covers/2.jpg',
    thumb: '/thumbs/vol2.jpg',
    pages: [
      '1.jpg', '2.jpg', '3.jpg', '5.jpg', '6.jpg', '7.jpg', '8.jpg', '9.jpg',
      '10.jpg', '11.jpg', '12.jpg', '13.jpg', '14.jpg', '15.jpg', '16.jpg',
      '17.jpg', '18.jpg', '19.jpg', '20.jpg'
    ],
    pageDir: 'vol2',
    bgm: '/bgm/vol2.mp3',
    page_audios: {
      0: { src: '/audios/vol2.mp3', title: '01. 김집사님의 고백 - 신년호' },
      5: { src: '/audios/vol2-2.mp3', title: '02. 구별된 자의 길' },
      12: { src: '/audios/vol2-3.mp3', title: '03. 새로운 다짐, 2026' }
    }
  },
  {
    vid: 'vol3',
    title: '2026년 2월호',
    date: '2026년 2월호',
    tags: ['#아버지', '#마음', '#아버지의마음'],
    summary: '요나서로 보는 하나님의 마음.',
    cover: '/covers/3.jpg',
    thumb: '/thumbs/vol3.jpg',
    pages: [
      '1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg', '7.jpg', '8.jpg',
      '9.jpg', '10.jpg', '11.jpg', '12.jpg', '13.jpg', '14.jpg', '15.jpg',
      '16.jpg', '17.jpg', '18.jpg', '19.jpg', '20.jpg', '21.jpg'
    ],
    pageDir: 'vol3',
    bgm: '/bgm/vol3.mp3',
    page_audios: {
      0: { src: '/audios/vol3.mp3', title: '아버지의 마음_하문기전도사' },
      22: { src: '/audios/vol3-2.mp3', title: '간증' },
      30: { src: '/audios/vol3-3.mp3', title: '기도부탁' }
    }
  },
  {
    vid: 'vol4',
    title: '2026년 3월호',
    date: '2026년 3월호',
    tags: [],
    summary: 'Coming soon',
    cover: '/covers/4.jpg',
    thumb: '/thumbs/vol4.jpg',
    pages: ['1.jpg'],
    pageDir: 'vol4',
    bgm: '',
    page_audios: {}
  }
];

// ── 책 목록 API ────────────────────────────────────────────────────────
app.get('/api/books', (req, res) => {
  const { search, tag } = req.query;
  let result = [...VOL_DATA];

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(b =>
      b.title.toLowerCase().includes(q) ||
      b.summary.toLowerCase().includes(q) ||
      b.tags.some(t => t.toLowerCase().includes(q))
    );
  }
  if (tag) {
    result = result.filter(b => b.tags.includes(tag));
  }

  res.json(result);
});

// ── 단권 상세 API ─────────────────────────────────────────────────────
app.get('/api/books/:vid', (req, res) => {
  const book = VOL_DATA.find(b => b.vid === req.params.vid);
  if (!book) return res.status(404).json({ error: 'Not found' });
  res.json(book);
});

// ── 댓글 API (SQLite) ─────────────────────────────────────────────────
app.get('/api/comments/:vid', (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM comments WHERE vid = ? ORDER BY created_at DESC'
  ).all(req.params.vid);
  res.json(rows);
});

app.post('/api/comments', (req, res) => {
  const { vid, author, content } = req.body;
  if (!vid || !author || !content) {
    return res.status(400).json({ error: '필드가 누락되었습니다.' });
  }
  const stmt = db.prepare('INSERT INTO comments (vid, author, content) VALUES (?, ?, ?)');
  const info = stmt.run(vid, author.trim(), content.trim());
  const newRow = db.prepare('SELECT * FROM comments WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(newRow);
});

// ── 서버 시작 ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log('📚 VOL_DATA loaded: vol1~vol4');
  console.log('💬 SQLite comments DB ready');
});
