import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000';

// ── 책 슬롯 좌표 (퍼센트 단위, 9:16 배경 기준) ──────────────────────────────
const SLOT_COORDS = [
  { id: 1773461948124, label: '슬롯 1', top: '35.52%', left: '24.07%', width: '21.8%', height: '24.41%' },
  { id: 1773461958562, label: '슬롯 2', top: '35.52%', left: '54.27%', width: '23.8%', height: '24.07%' },
  { id: 1773461966454, label: '슬롯 3', top: '73.99%', left: '23.87%', width: '23.4%', height: '22.27%' },
  { id: 1773461972651, label: '슬롯 4', top: '73.99%', left: '53.47%', width: '24.4%', height: '22.61%' },

];

// ── 타이틀 좌표 (퍼센트 단위) ────────────────────────────────────────────────
const TITLE_COORDS = [
  {
    id: 't1',
    label: '월간 181',
    top: '8%', left: '15%', width: '70%', height: '10%',
    style: 'wood',     // 나무 음각
  },
  {
    id: 't2',
    label: '디지털 서재',
    top: '24.98%', left: '29.82%', width: '40%', height: '5.06%',
    style: 'metal',    // 금속 음각
  },
];

// ── % 변환 헬퍼 ───────────────────────────────────────────────────────────────
const pct = (n) => `${Math.round(n * 100) / 100}%`;

// ══════════════════════════════════════════════════════════════════════════════
// 에디터 드래그 로직 (공통) — 모드(slot/title)와 무관하게 같은 드래그 로직 사용
// ══════════════════════════════════════════════════════════════════════════════
function useDragDraw(stageRef, onDone) {
  const [dragging, setDragging] = useState(false);
  const [rect, setRect] = useState(null);
  const start = useRef(null);

  const getXY = useCallback((e) => {
    const r = stageRef.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0, W: 1, H: 1 };
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.max(0, Math.min(r.width, cx - r.left)),
      y: Math.max(0, Math.min(r.height, cy - r.top)),
      W: r.width, H: r.height,
    };
  }, [stageRef]);

  const down = useCallback((e) => {
    e.preventDefault();
    const { x, y } = getXY(e);
    start.current = { x, y };
    setRect({ x, y, w: 0, h: 0 });
    setDragging(true);
  }, [getXY]);

  const move = useCallback((e) => {
    if (!dragging || !start.current) return;
    e.preventDefault();
    const { x, y } = getXY(e);
    const { x: sx, y: sy } = start.current;
    setRect({ x: Math.min(x, sx), y: Math.min(y, sy), w: Math.abs(x - sx), h: Math.abs(y - sy) });
  }, [dragging, getXY]);

  const up = useCallback((e) => {
    if (!dragging || !start.current) return;
    const { W, H } = getXY(e);
    if (rect?.w > 4 && rect?.h > 4) {
      onDone({ x: rect.x, y: rect.y, w: rect.w, h: rect.h, W, H });
    }
    setDragging(false);
    setRect(null);
    start.current = null;
  }, [dragging, rect, getXY, onDone]);

  useEffect(() => {
    if (!dragging) return;
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [dragging, move, up]);

  return { rect, dragging, down };
}

// ══════════════════════════════════════════════════════════════════════════════
// 에디터 오버레이 (슬롯 / 타이틀 공용)
// ══════════════════════════════════════════════════════════════════════════════
function EditorOverlay({ stageRef, editorTab, drawnSlots, drawnTitles, onAddSlot, onAddTitle }) {
  const handleDone = useCallback(({ x, y, w, h, W, H }) => {
    const entry = {
      id: Date.now(),
      top: pct((y / H) * 100),
      left: pct((x / W) * 100),
      width: pct((w / W) * 100),
      height: pct((h / H) * 100),
    };
    if (editorTab === 'slot') {
      onAddSlot({ ...entry, label: `슬롯 ${SLOT_COORDS.length + drawnSlots.length + 1}` });
    } else {
      onAddTitle({ ...entry, label: `타이틀 ${TITLE_COORDS.length + drawnTitles.length + 1}`, style: 'wood' });
    }
  }, [editorTab, drawnSlots.length, drawnTitles.length, onAddSlot, onAddTitle]);

  const { rect, down } = useDragDraw(stageRef, handleDone);

  const slotColor = 'rgba(251,191,36,.6)';
  const newSlotClr = '#10b981';
  const titleColor = 'rgba(167,139,250,.7)';
  const newTitleClr = '#a78bfa';
  const activeColor = editorTab === 'slot' ? newSlotClr : newTitleClr;

  return (
    <>
      {/* 드래그 가능 레이어 */}
      <div className="editor-drag-layer" onMouseDown={down} onTouchStart={down}
        style={{ cursor: 'crosshair' }} />

      {/* 현재 그리는 사각형 */}
      {rect && rect.w > 2 && (
        <div className="editor-draw-rect"
          style={{
            left: rect.x, top: rect.y, width: rect.w, height: rect.h,
            borderColor: activeColor, boxShadow: `0 0 8px ${activeColor}`
          }} />
      )}

      {/* 기존 SLOT_COORDS 미리보기 (황색) */}
      {SLOT_COORDS.map(s => (
        <div key={s.id} className="editor-slot-preview"
          style={{ top: s.top, left: s.left, width: s.width, height: s.height, borderColor: slotColor }}>
          <span className="editor-slot-label">#{s.label}</span>
        </div>
      ))}
      {/* 새로 그린 슬롯 (녹색) */}
      {drawnSlots.map(s => (
        <div key={s.id} className="editor-slot-new"
          style={{ top: s.top, left: s.left, width: s.width, height: s.height }}>
          <span className="editor-slot-label">+{s.label}</span>
        </div>
      ))}

      {/* 기존 TITLE_COORDS 미리보기 (보라) */}
      {TITLE_COORDS.map(t => (
        <div key={t.id} className="editor-title-preview"
          style={{ top: t.top, left: t.left, width: t.width, height: t.height, borderColor: titleColor }}>
          <span className="editor-slot-label" style={{ color: '#c4b5fd' }}>T:{t.label}</span>
        </div>
      ))}
      {/* 새로 그린 타이틀 (밝은 보라) */}
      {drawnTitles.map(t => (
        <div key={t.id} className="editor-title-new"
          style={{ top: t.top, left: t.left, width: t.width, height: t.height }}>
          <span className="editor-slot-label" style={{ color: '#ede9fe' }}>T+{t.label}</span>
        </div>
      ))}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 좌표 패널 (슬롯 / 타이틀 탭 전환)
// ══════════════════════════════════════════════════════════════════════════════
function CoordPanel({ drawnSlots, drawnTitles, onClearSlots, onClearTitles }) {
  const [tab, setTab] = useState('slot');

  const slotCode = drawnSlots.length === 0
    ? '// 배경 위를 드래그하여 슬롯을 그리세요.'
    : drawnSlots.map(s =>
      `  { id: ${s.id}, label: '${s.label}', top: '${s.top}', left: '${s.left}', width: '${s.width}', height: '${s.height}' },`
    ).join('\n');

  const titleCode = drawnTitles.length === 0
    ? '// 타이틀 탭에서 드래그하여 위치를 지정하세요.'
    : drawnTitles.map(t =>
      `  { id: '${t.id}', label: '${t.label}', top: '${t.top}', left: '${t.left}', width: '${t.width}', height: '${t.height}', style: 'wood' },`
    ).join('\n');

  const code = tab === 'slot' ? slotCode : titleCode;
  const varName = tab === 'slot' ? 'SLOT_COORDS' : 'TITLE_COORDS';
  const onClear = tab === 'slot' ? onClearSlots : onClearTitles;

  return (
    <div className="coord-panel">
      {/* 탭 */}
      <div className="flex gap-1 mb-3">
        {[['slot', '📚 책 슬롯'], ['title', '✍️ 타이틀']].map(([key, lbl]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`coord-tab ${tab === key ? 'active' : ''}`}>
            {lbl}
          </button>
        ))}
        <button onClick={onClear}
          className="ml-auto text-[10px] text-red-400 hover:text-red-300 border border-red-800 px-2 py-0.5 rounded">
          초기화
        </button>
      </div>

      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] text-green-400 font-bold">
          📐 const {varName} = [
        </span>
      </div>
      <pre className="coord-code">{code}</pre>
      <div className="text-[10px] text-green-400 font-bold mt-0.5">];</div>

      {(tab === 'slot' ? drawnSlots : drawnTitles).length > 0 && (
        <button onClick={() => navigator.clipboard?.writeText(`const ${varName} = [\n${code}\n];`)}
          className="mt-2 text-[10px] bg-green-900/40 hover:bg-green-800/60 text-green-300 border border-green-700 px-3 py-1 rounded w-full transition-colors">
          📋 전체 복사
        </button>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 음각 타이틀 렌더러
// ══════════════════════════════════════════════════════════════════════════════
function EngravedTitle({ titleCoord }) {
  const isWood = titleCoord.style === 'wood';

  const woodStyle = {
    color: 'rgba(45, 25, 10, 0.85)',
    textShadow: [
      '-1px -1px 1px rgba(0,0,0,0.75)',
      '1px 1px 1px rgba(255,255,255,0.12)',
      '0 0 6px rgba(0,0,0,0.4)',
    ].join(', '),
    fontFamily: "'Gmarket Sans', 'Pretendard', 'Georgia', serif",
    fontWeight: 'bold',
    letterSpacing: '0.1rem',
    fontSize: '3rem',
  };

  const metalStyle = {
    color: 'rgba(60, 40, 10, 0.92)',
    textShadow: [
      '0px 1px 1px rgba(255,255,255,0.35)',
      '0px -1px 1px rgba(0,0,0,0.5)',
    ].join(', '),
    fontFamily: "'Gmarket Sans', 'Pretendard', 'Georgia', serif",
    fontWeight: 'bold',
    letterSpacing: '0.3rem',
    fontSize: '1.5rem',
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: titleCoord.top,
        left: titleCoord.left,
        width: titleCoord.width,
        height: titleCoord.height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <span
        className={`engraved-title ${isWood ? 'engraved-wood' : 'engraved-metal'}`}
        style={isWood ? woodStyle : metalStyle}
      >
        {titleCoord.label}
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 책 카드
// ══════════════════════════════════════════════════════════════════════════════
function BookCard({ book, slot, onClick, editorMode }) {
  return (
    <div
      style={{
        position: 'absolute', top: slot.top, left: slot.left,
        width: slot.width, height: slot.height
      }}
      className={`book-slot-card ${editorMode ? 'pointer-events-none' : ''} group`}
      onClick={!editorMode ? onClick : undefined}
      title={book?.title}
    >
      <div className="slot-frame" />
      <img src={book?.thumb} alt={book?.title}
        className="w-full h-full object-cover" draggable={false} />
      <div className="slot-inset-shadow" />
      {!editorMode && (
        <div className="slot-hover-info">
          <p className="text-[10px] font-bold text-amber-200 leading-tight line-clamp-2">{book?.title}</p>
          {book?.tags?.length > 0 && (
            <div className="flex flex-wrap gap-0.5 mt-0.5">
              {book.tags.slice(0, 2).map(t => (
                <span key={t} className="text-[8px] text-amber-300/80">{t}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 초과 분 선반
// ══════════════════════════════════════════════════════════════════════════════
function OverflowSection({ books, onBookClick }) {
  if (!books.length) return null;
  return (
    <div className="overflow-section">
      <p className="text-center text-xs text-amber-700/60 mb-6 tracking-widest">— 추가 기록물 —</p>
      <div className="overflow-shelf">
        {books.map(book => (
          <div key={book.vid} className="overflow-book group cursor-pointer"
            onClick={() => onBookClick(book.vid)}>
            <div className="book-3d overflow-3d">
              <div className="book-spine" />
              <div className="book-face">
                <img src={book.thumb} alt={book.title} className="w-full h-full object-cover" />
              </div>
              <div className="book-pages-edge" />
            </div>
            <div className="nametag mt-2">
              <span className="nametag-pin left-1.5" /><span className="nametag-pin right-1.5" />
              <div className="text-[9px] font-bold text-amber-900 truncate">{book.date}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="shelf-lip" />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 메인 LibraryPage
// ══════════════════════════════════════════════════════════════════════════════
export default function LibraryPage() {
  const [books, setBooks] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editorMode, setEditorMode] = useState(false);
  const [editorTab, setEditorTab] = useState('slot');   // 'slot' | 'title'
  const [drawnSlots, setDrawnSlots] = useState([]);
  const [drawnTitles, setDrawnTitles] = useState([]);
  const stageRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => fetchBooks(), 150);
    return () => clearTimeout(t);
  }, [search]);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const url = new URL(`${API}/api/books`);
      if (search) url.searchParams.set('search', search);
      const res = await fetch(url);
      setBooks(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const slottedBooks = books.slice(0, SLOT_COORDS.length);
  const overflowBooks = books.slice(SLOT_COORDS.length);

  return (
    <div className="library-page-root">
      <div style={{ width: '100%', maxWidth: '500px' }}>

        {/* ── 툴바 ── */}
        <div className="library-toolbar">
          {/* 검색창 */}
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-900/70 select-none">✏</span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="검색어를 입력하세요..."
              className="nameplate-input w-full pl-9 pr-7 py-2 text-sm font-bold
                         text-stone-900 placeholder-amber-900/50 focus:outline-none" />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-amber-900/60 hover:text-amber-900 text-base">
                ×
              </button>
            )}
          </div>

          {/* 에디터 모드 토글 */}
          <button onClick={() => setEditorMode(m => !m)}
            className={`editor-toggle-btn ${editorMode ? 'active' : ''}`}>
            {editorMode ? '✅ 에디터 종료' : '📐 에디터 모드'}
          </button>
        </div>

        {/* 에디터 모드: 슬롯 / 타이틀 탭 전환 */}
        {editorMode && (
          <div className="flex gap-0 border-b border-white/10 bg-black/40">
            {[['slot', '📚 책 슬롯 지정'], ['title', '✍️ 타이틀 지정']].map(([key, lbl]) => (
              <button key={key} onClick={() => setEditorTab(key)}
                className={`editor-mode-tab ${editorTab === key ? 'active' : ''}`}>
                {lbl}
              </button>
            ))}
          </div>
        )}

        {/* ── 배경 이미지 스테이지 ── */}
        <div className="bg-stage" ref={stageRef}>

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <div className="text-amber-300 text-xl font-serif animate-pulse">서재를 밝히는 중…</div>
            </div>
          )}

          {!loading && books.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <div className="bg-black/60 text-amber-400 font-bold px-6 py-4 rounded-lg">
                찾으시는 기록물이 없습니다.
              </div>
            </div>
          )}

          {/* 음각 타이틀 렌더링 */}
          {TITLE_COORDS.map(tc => (
            <EngravedTitle key={tc.id} titleCoord={tc} />
          ))}

          {/* 책 슬롯 카드 */}
          {!loading && slottedBooks.map((book, idx) => (
            <BookCard key={book.vid} book={book} slot={SLOT_COORDS[idx]}
              editorMode={editorMode} onClick={() => navigate(`/vol/${book.vid}`)} />
          ))}

          {/* 에디터 오버레이 */}
          {editorMode && (
            <EditorOverlay
              stageRef={stageRef}
              editorTab={editorTab}
              drawnSlots={drawnSlots}
              drawnTitles={drawnTitles}
              onAddSlot={s => setDrawnSlots(p => [...p, s])}
              onAddTitle={t => setDrawnTitles(p => [...p, t])}
            />
          )}
        </div>

        {/* 좌표 패널 */}
        {editorMode && (
          <CoordPanel
            drawnSlots={drawnSlots}
            drawnTitles={drawnTitles}
            onClearSlots={() => setDrawnSlots([])}
            onClearTitles={() => setDrawnTitles([])}
          />
        )}

        {/* 초과 분 선반 */}
        {!loading && <OverflowSection books={overflowBooks} onBookClick={vid => navigate(`/vol/${vid}`)} />}

      </div>
    </div>
  );
}
