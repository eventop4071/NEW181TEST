import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import HTMLFlipBook from 'react-pageflip';

const API = 'http://localhost:5000';

// 화면 768px 이하일 때 true 리턴 (서버사이드 렌더링 안전하게 window 가운데하기)
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

// ─── BGM 훅 ─────────────────────────────────────────────────────────────────
function useBGM(src) {
  const ref = useRef(new Audio());
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    if (!src) return;
    ref.current.src = src;  // 이미 '/bgm/vol1.mp3' 형태의 절대 경로
    ref.current.loop = true;
    ref.current.volume = 0.35;
    ref.current.play().catch(() => {});
    return () => { ref.current.pause(); ref.current.src = ''; };
  }, [src]);
  const toggle = () => {
    if (muted) { ref.current.play().catch(() => {}); setMuted(false); }
    else { ref.current.pause(); setMuted(true); }
  };
  return { muted, toggle };
}

// ─── 오디오 플레이어 ─────────────────────────────────────────────────────────
function AudioPlayer({ pageAudios }) {
  const audioRef = useRef(new Audio());
  const progressRef = useRef();
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [trackIdx, setTrackIdx] = useState(0);
  const tracks = Object.values(pageAudios || {});

  useEffect(() => {
    if (!tracks.length) return;
    const a = audioRef.current;
    a.src = tracks[trackIdx].src;  // 이미 '/audios/...' 형태의 절대 경로
    a.load();
    const onMeta = () => setDuration(a.duration);
    const onTime = () => setCurrentTime(a.currentTime);
    const onEnd = () => setPlaying(false);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('ended', onEnd);
    return () => {
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('ended', onEnd);
      a.pause();
    };
  }, [trackIdx, tracks.length]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().catch(() => {}); setPlaying(true); }
  };

  const seek = e => {
    const a = audioRef.current;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    a.currentTime = ratio * duration;
  };

  const fmt = s => {
    if (!s || isNaN(s)) return '0:00';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  if (!tracks.length) return null;

  return (
    <div className="audio-player-bar">
      {/* 재생/정지 버튼 */}
      <button onClick={togglePlay} className="play-btn" aria-label={playing ? '정지' : '재생'}>
        {playing ? (
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><polygon points="5,3 19,12 5,21"/></svg>
        )}
      </button>

      {/* 트랙명 + 타임라인 */}
      <div className="flex-1 flex flex-col gap-1">
        {/* 섹션 셀렉터 */}
        <div className="flex items-center justify-between">
          <select
            value={trackIdx}
            onChange={e => { setTrackIdx(Number(e.target.value)); setPlaying(false); }}
            className="audio-select text-xs bg-transparent text-green-300 border border-green-800 rounded px-1 py-0.5 max-w-[60%] truncate">
            {tracks.map((t, i) => (
              <option key={i} value={i} className="bg-stone-900">{t.title}</option>
            ))}
          </select>
          <span className="text-[10px] text-stone-500 font-mono">
            {fmt(currentTime)} / {fmt(duration)}
          </span>
        </div>

        {/* 프로그레스 바 */}
        <div ref={progressRef}
          onClick={seek}
          className="relative w-full h-2 bg-stone-700 rounded-full cursor-pointer group">
          <div className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }} />
          <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-green-400 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: duration ? `calc(${(currentTime / duration) * 100}% - 6px)` : '0' }} />
        </div>
      </div>
    </div>
  );
}

// ─── 댓글 게시판 ─────────────────────────────────────────────────────────────
function CommentBoard({ vid }) {
  const [comments, setComments] = useState([]);
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/comments/${vid}`);
      setComments(await res.json());
    } catch {}
  }, [vid]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const submit = async e => {
    e.preventDefault();
    if (!author.trim() || !content.trim()) return;
    setSending(true);
    try {
      await fetch(`${API}/api/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vid, author, content })
      });
      setContent('');
      await fetchComments();
    } finally { setSending(false); }
  };

  return (
    <div className="comment-board">
      <h3 className="flex items-center gap-2 text-base font-bold text-amber-400 mb-4">
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-amber-400"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/></svg>
        나눔의 소리
      </h3>

      {/* 댓글 목록 */}
      <div className="space-y-3 mb-6 max-h-48 overflow-y-auto pr-1">
        {comments.length === 0 && (
          <p className="text-stone-500 text-sm text-center py-4">첫 번째 나눔을 남겨보세요 ✨</p>
        )}
        {comments.map(c => (
          <div key={c.id} className="comment-item">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-full bg-amber-800/40 flex items-center justify-center text-amber-400 text-xs font-bold">
                {c.author[0]}
              </div>
              <span className="text-xs font-bold text-stone-300">{c.author}</span>
              <span className="text-[10px] text-stone-600 ml-auto">{c.created_at?.slice(0, 16)}</span>
            </div>
            <p className="text-sm text-stone-400 leading-relaxed pl-9">{c.content}</p>
          </div>
        ))}
      </div>

      {/* 입력 폼 */}
      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
        <input value={author} onChange={e => setAuthor(e.target.value)}
          placeholder="닉네임" maxLength={20}
          className="comment-input w-full sm:w-28 shrink-0" />
        <input value={content} onChange={e => setContent(e.target.value)}
          placeholder="따뜻한 마음을 나눠주세요..."
          className="comment-input flex-1 min-w-0" />
        <button type="submit" disabled={sending}
          className="comment-submit shrink-0">
          {sending ? '전송 중…' : '전송'}
        </button>
      </form>
    </div>
  );
}

// ─── 상세 페이지 ─────────────────────────────────────────────────────────────
export default function DetailPage() {
  const { vid } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [flipState, setFlipState] = useState('idle'); // 'idle' | 'flipping'
  const flipRef = useRef();
  const { muted, toggle: toggleBGM } = useBGM(book?.bgm);
  const isMobile = useIsMobile();


  useEffect(() => {
    fetch(`${API}/api/books/${vid}`)
      .then(r => r.json())
      .then(data => { setBook(data); setLoading(false); })
      .catch(() => { navigate('/'); });
  }, [vid, navigate]);

  if (loading) return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center">
      <div className="text-amber-400 text-xl animate-pulse">페이지를 열고 있습니다…</div>
    </div>
  );

  // 페이지 목록: 커버(1장) + 본문 페이지들
  const allPages = [
    { src: book.cover, isCover: true },                          // '/covers/1.jpg'
    ...book.pages.map(p => ({ src: `/${book.pageDir}/${p}`, isCover: false })) // '/vol1/1 (1).jpg'
  ];
  const total = allPages.length;

  const goPrev = () => { if (page > 0) { flipRef.current?.pageFlip()?.flipPrev(); } };
  const goNext = () => { if (page < total - 1) { flipRef.current?.pageFlip()?.flipNext(); } };

  return (
    <div className="min-h-screen text-stone-300 font-sans flex flex-col"
      style={{ background: 'linear-gradient(180deg, #080808 0%, #0a0805 100%)' }}>

      {/* ── 최상단 네비 + BGM ── */}
      <div className="flex items-center justify-between px-4 md:px-8 py-3 sticky top-0 z-50"
        style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(12px)',
                 borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-stone-400 hover:text-amber-400 transition-colors text-sm">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          서재로
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500 hidden sm:inline">배경음악</span>
          <button onClick={toggleBGM}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all">
            {muted ? (
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-stone-400"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-amber-400"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
            )}
          </button>
        </div>
      </div>

      {/* ── 제목 ── */}
      <div className="text-center py-4 px-4">
        <h1 className="text-lg md:text-2xl font-bold text-stone-100 font-serif">
          {book.title}
        </h1>
        <p className="text-xs text-stone-500 mt-1">{book.summary}</p>
      </div>

      {/* ── 플립북 뷰어 — 다크 비네팅 배경 ── */}
      <div className="flipbook-area">
        <div className="flipbook-stage">
          {/* 이전 */}
          <button onClick={goPrev} disabled={page === 0}
            className="flip-arrow left-1 md:left-6"
            aria-label="이전 페이지">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
          </button>

          {/* 플립북 래퍼 — perspective + 조명 연출 */}
          <div className="flex-1 px-0" style={{
            /* 페이지 번호에 따라 -8° ~ +8° 조명 각도 변화 */
            '--light-angle': `${(page / Math.max(1, total - 1) - 0.5) * 16}deg`,
            filter: flipState === 'flipping'
              ? 'brightness(1.04) contrast(1.02)'
              : 'none',
            transition: 'filter 0.4s ease',
          }}>
            <HTMLFlipBook
              ref={flipRef}
              width={380} height={540}
              size="stretch"
              minWidth={220} maxWidth={600}
              minHeight={340} maxHeight={800}
              showCover={true}
              usePortrait={true}
              singlePage={isMobile}
              mobileScrollSupport={false}
              flippingTime={700}
              maxShadowOpacity={0.6}
              className="flipbook-shadow"
              style={{ backgroundColor: 'transparent' }}
              onFlip={e => setPage(e.data)}
              onChangeState={s => setFlipState(s === 'user_fold' || s === 'flipping' ? 'flipping' : 'idle')}
            >
              {allPages.map((p, i) => {
                /* 짝수 인덱스: 왜쪽, 홀수: 오른쪽 — 체등 그림자 CSS 제어용 */
                const side = i % 2 === 0 ? 'left-page' : 'right-page';
                return (
                  <div key={i} className={`page-leaf ${side}`}>
                    <img
                      src={p.src}
                      alt={`Page ${i + 1}`}
                      className="w-full h-full object-contain"
                      onError={e => { e.target.style.opacity = 0.2; }}
                    />
                  </div>
                );
              })}
            </HTMLFlipBook>

            {/* 체등 중앙선 그림자 오버레이 — react-pageflip 위에 고정 */} 
            {!isMobile && (
              <div style={{
                position: 'absolute', top: 0, left: '50%',
                transform: 'translateX(-50%)',
                width: '14px', height: '100%',
                background: 'linear-gradient(to right, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.06) 50%, rgba(0,0,0,0.30) 100%)',
                pointerEvents: 'none',
                zIndex: 10,
              }} />
            )}
          </div>

          {/* 다음 */}
          <button onClick={goNext} disabled={page >= total - 1}
            className="flip-arrow right-1 md:right-6"
            aria-label="다음 페이지">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          </button>
        </div>

        {/* 바닥 플랫폼 그림자 */}
        <div className="flipbook-platform" />

        {/* 페이지 번호 — 금색 */}
        <div className="flex items-center justify-center py-2">
          <span className="text-[11px] font-mono tracking-widest"
            style={{ color: 'rgba(212,168,67,0.75)', textShadow: '0 0 8px rgba(212,168,67,.3)' }}>
            {page + 1} / {total}
          </span>
        </div>
      </div>


      {/* ── 오디오 플레이어 ── */}
      <div className="w-full max-w-3xl mx-auto px-4 mt-4">
        <AudioPlayer pageAudios={book.page_audios} />
      </div>

      {/* ── 댓글 게시판 ── */}
      <div className="w-full max-w-3xl mx-auto px-4 mt-6 mb-16">
        <CommentBoard vid={vid} />
      </div>
    </div>
  );
}
