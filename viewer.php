<?php
/*
[데이터베이스 생성 및 초기화 쿼리 (XAMPP 환경 용도)]

CREATE DATABASE IF NOT EXISTS monthly181 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE monthly181;

CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vid VARCHAR(50) NOT NULL,
    author VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
*/

// --- 공통 데이터 불러오기 ---
require_once 'data.php';

// --- PDO 설정 및 DB 연결 ---
$dbHost = "localhost";
$dbName = "monthly181";
$dbUser = "root";
$dbPass = "";

try {
    // 최초 실행 편의성을 위해 DB 및 테이블 존재 여부 확인 후 자동 생성
    $pdo_temp = new PDO("mysql:host={$dbHost};charset=utf8mb4", $dbUser, $dbPass);
    $pdo_temp->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo_temp->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo_temp->exec("USE `{$dbName}`");
    $pdo_temp->exec("
        CREATE TABLE IF NOT EXISTS comments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vid VARCHAR(50) NOT NULL,
            author VARCHAR(100) NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");
    $pdo = $pdo_temp;
} catch (PDOException $e) {
    // DB 에러가 발생해도 사이트는 동작하도록 예외 처리
    $pdo = null;
}

// 파라미터에서 현재 호수(vid)를 받아옵니다
$vid = isset($_GET['vid']) ? $_GET['vid'] : 'vol1';

// --- 현재 데이터 매칭 ---
$currentVol = null;
foreach ($VOL_DATA as $vol) {
    if ($vol['vid'] === $vid) {
        $currentVol = $vol;
        break;
    }
}
// 매칭되는 vid가 없으면 기본값(첫번째 호수) 설정
if (!$currentVol) {
    $currentVol = $VOL_DATA[0];
    $vid = $currentVol['vid'];
}

// --- 폼 전송 데이터 처리 (댓글 INSERT 로직) ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'add_comment') {
    $author = isset($_POST['author']) ? trim($_POST['author']) : '';
    $content = isset($_POST['content']) ? trim($_POST['content']) : '';

    if ($pdo && !empty($author) && !empty($content)) {
        // 보안을 위한 PDO Prepared Statement
        $stmt = $pdo->prepare("INSERT INTO comments (vid, author, content) VALUES (:vid, :author, :content)");
        $stmt->execute([':vid' => $vid, ':author' => $author, ':content' => $content]);

        // 새로고침 폼 재전송 방지를 위한 Redirect
        header("Location: viewer.php?vid=" . urlencode($vid));
        exit;
    }
}

// --- 현재 호수 댓글 데이터 SELECT 로직 ---
$comments = [];
if ($pdo) {
    $stmt = $pdo->prepare("SELECT * FROM comments WHERE vid = :vid ORDER BY created_at ASC");
    $stmt->execute([':vid' => $vid]);
    $comments = $stmt->fetchAll(PDO::FETCH_ASSOC);
}

// JS에서 페이지 렌더링을 위해 사용하는 배열
$pagesJson = json_encode($currentVol['pages']);
// 새로운 페이지별 오디오 꼬리표 (없으면 빈 객체)
$pageAudiosJson = isset($currentVol['page_audios']) ? json_encode($currentVol['page_audios']) : '{}';
$defaultBgm = isset($currentVol['bgm']) ? $currentVol['bgm'] : '';
?>
<!DOCTYPE html>
<html lang="ko">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Monthly 181 Viewer - <?= htmlspecialchars($currentVol['title']) ?></title>

    <!-- Tailwind CSS (CDN) -->
    <script src="https://cdn.tailwindcss.com"></script>

    <!-- Lucide Icons -->
    <script src="https://unpkg.com/lucide@latest"></script>

    <!-- stPageFlip 라이브러리 (CDN) -->
    <script src="https://cdn.jsdelivr.net/npm/page-flip/dist/js/page-flip.browser.min.js"></script>

    <!-- Swiper 라이브러리 (CDN) -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css" />
    <script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>

    <!-- 커스텀 스타일 및 애니메이션 -->
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=Noto+Serif+KR:wght@400;700&display=swap');

        body {
            font-family: 'Gowun Batang', 'Noto Serif KR', serif;
        }

        .font-sans {
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
        }

        .font-serif {
            font-family: 'Gowun Batang', 'Noto Serif KR', serif;
        }

        .font-mono {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        }

        /* 오디오 플레이어 흐르는 글씨 (Marquee) 텍스트 애니메이션 */
        .marquee-container {
            overflow: hidden;
            position: relative;
            white-space: nowrap;
            width: 100%;
        }

        .marquee-text {
            display: inline-block;
            padding-left: 100%;
            animation: marquee 12s linear infinite;
        }

        @keyframes marquee {
            0% {
                transform: translateX(0);
            }

            100% {
                transform: translateX(-100%);
            }
        }

        /* 플립북 & 플레이어 통합 레이아웃 클래스 */
        .book-player-container {
            background: #2a2a2a;
            /* 뷰어 내부 컨테이너의 통일된 배경색 */
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 40px 80px -20px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.05);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        /* 오디오 플레이어 커스텀 스타일 */
        .audio-player-integrated {
            background: #1e1e1e;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            padding: 1rem 1.5rem;
            display: flex;
            align-items: center;
            gap: 1rem;
            box-shadow: inset 0 10px 15px -10px rgba(0, 0, 0, 0.5);
            position: relative;
            z-index: 10;
        }

        /* stPageFlip 전용 페이지 스타일 */
        .my-page {
            background-color: #f5f5f5;
            /* 종이 기본 질감 색상 */
            box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.05);
            /* 약간의 내부 음영 */
        }

        /* 책 양장본 같은 테두리 음영 (펼쳤을 때 제본선 느낌) */
        .my-page.--left {
            border-right: 1px solid rgba(0, 0, 0, 0.1);
            box-shadow: inset -10px 0 20px -10px rgba(0, 0, 0, 0.15);
        }

        .my-page.--right {
            border-left: 1px solid rgba(0, 0, 0, 0.1);
            box-shadow: inset 10px 0 20px -10px rgba(0, 0, 0, 0.15);
        }
    </style>
</head>

<body class="min-h-screen bg-[#1a1a1a] text-stone-300 font-sans selection:bg-amber-500/30 pb-10">

    <!-- 상단바 영역 -->
    <nav
        class="border-b border-white/5 bg-black/40 backdrop-blur-md px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div class="flex items-center gap-2">
            <div class="w-8 h-8 bg-amber-600 rounded flex items-center justify-center font-black text-black text-xs">181
            </div>
            <span
                class="font-serif font-bold text-lg tracking-tight text-stone-100"><?= htmlspecialchars($currentVol['title']) ?></span>
        </div>
        <div class="flex gap-4">
            <a href="index.php"
                class="text-xs font-bold hover:text-amber-500 transition-colors flex items-center gap-1">
                <i data-lucide="library" style="width:14px;height:14px;"></i> 서가
            </a>
        </div>
    </nav>

    <!-- 메인 레이아웃 (모바일 꽉 찬 화면을 위해 padding 조정 px-0 md:px-10) -->
    <main class="w-full max-w-5xl mx-auto px-0 md:px-10 py-0 md:py-10 flex flex-col items-center">

        <!-- ========================= 플립북 및 오디오 플레이어 일체형 영역 ========================= -->
        <!-- book-player-container로 묶어서 동일한 너비와 디자인 적용 (모바일에선 둥근 모서리 해제하여 더 꽉차게) -->
        <div class="book-player-container w-full relative mb-12 sm:rounded-2xl rounded-none">

            <!-- 상단 BGM 전용 컨트롤러 바 추가 -->
            <?php if (!empty($defaultBgm)): ?>
                <div
                    class="bg-[#1e1e1e] border-b border-white/5 px-4 py-3 flex items-center justify-between z-10 w-full shadow-md">
                    <div class="flex items-center gap-2">
                        <i data-lucide="music" class="text-amber-500" style="width:14px;height:14px;"></i>
                        <span class="text-[12px] font-bold text-stone-300 tracking-wider">배경음악 (BGM)</span>
                    </div>
                    <!-- BGM 재생/일시정지 토글 버튼 -->
                    <button id="bgm-toggle-btn"
                        class="w-8 h-8 rounded-full bg-black/40 hover:bg-black/80 border border-white/10 flex items-center justify-center transition-all text-stone-400 focus:outline-none shadow-inner z-50">
                        <span id="bgm-icon-container"><i data-lucide="volume-2" style="width:14px;height:14px;"></i></span>
                    </button>
                </div>
            <?php endif; ?>

            <!-- 플립북(실제 이미지 뷰어) 영역 -->
            <!-- 모바일에선 단면 1:1.414 비율, PC에선 양면 16:10 비율 -->
            <div
                class="relative w-full aspect-[1/1.414] md:aspect-[16/10] bg-[#333] p-0 md:p-8 shrink-0 flex items-center justify-center overflow-hidden">

                <!-- PC 전용: 3D 양면 책 효과 레이아웃 박스 (stPageFlip 타겟) -->
                <div id="desktop-book-wrapper" class="w-full h-full md:shadow-2xl" style="display: none;">
                    <!-- JS를 통해 여기에 실제 my-page 요소들이 렌더링 됩니다 -->
                </div>

                <!-- 모바일 전용: 단면 3D 넘김 슬라이더 (Swiper 타겟) -->
                <div id="mobile-swiper-container" class="swiper w-full h-full" style="display: none;">
                    <div class="swiper-wrapper" id="mobile-swiper-wrapper">
                        <!-- JS를 통해 swiper-slide가 렌더링 됩니다 -->
                    </div>
                </div>

                <!-- 페이지 이동 좌/우 버튼 (통합 컨테이너 안쪽에 위치) -->
                <button id="prev-page"
                    class="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 flex items-center justify-center text-white transition-all active:scale-90 z-50 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 shadow-lg"
                    aria-label="이전 페이지">
                    <i data-lucide="chevron-left" style="width:24px;height:24px;"></i>
                </button>
                <button id="next-page"
                    class="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 flex items-center justify-center text-white transition-all active:scale-90 z-50 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 shadow-lg"
                    aria-label="다음 페이지">
                    <i data-lucide="chevron-right" style="width:24px;height:24px;"></i>
                </button>

                <!-- 뷰어 페이지 위치 번호 표시 -->
                <div id="page-display"
                    class="absolute bottom-4 right-4 md:bottom-4 md:right-6 text-[11px] font-bold text-stone-300 drop-shadow-md z-50 bg-black/60 px-3 py-1 rounded-full border border-white/10">
                    Page 1 of <?= count($currentVol['pages']) ?>
                </div>
            </div>

            <!-- 오디오 플레이어 (JS 로직에서 동적 구현) -->
            <?php if (!empty($currentVol['page_audios'])): ?>
                <div class="audio-player-integrated w-full">
                    <!-- 재생/일시정지 컨트롤 아이콘 버튼 -->
                    <button id="audio-play-btn"
                        class="w-10 h-10 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-200 flex items-center justify-center transition-colors focus:outline-none flex-shrink-0 shadow-inner block border border-white/5"
                        aria-label="재생">
                        <span id="audio-icon-container" class="flex items-center justify-center w-full h-full">
                            <i data-lucide="play" style="width:18px;height:18px;fill:currentColor;margin-left:2px;"></i>
                        </span>
                    </button>

                    <!-- Marquee (흐르는 글씨) 음원 제목 영역 -->
                    <div
                        class="flex-1 marquee-container h-10 rounded overflow-hidden flex bg-[#111] border border-stone-800 shadow-inner items-center relative">
                        <div id="marquee-text" class="marquee-text text-[13px] text-green-400 font-mono font-bold">
                            🎵 재생을 누르면 음성이 시작됩니다.
                        </div>
                    </div>
                </div>
            <?php endif; ?>
        </div>

        <!-- ========================= 나눔의 소리(댓글/DB 연동) 영역 (여기도 모바일에선 padding 조절) ========================= -->
        <div class="bg-white/5 md:rounded-2xl p-6 border-y md:border border-white/5 shadow-lg w-full mb-10">
            <div class="flex justify-between items-center mb-6">
                <!-- 댓글 제목 및 아이콘 -->
                <h3 class="font-bold flex items-center gap-2">
                    <i data-lucide="message-circle" class="text-amber-500" style="width:18px;height:18px"></i> 나눔의 소리
                </h3>
                <!-- 좋아요 버튼 공간 -->
                <button id="like-btn"
                    class="flex items-center gap-1 text-sm font-bold text-stone-500 transition-colors">
                    <span id="like-icon-container"><i data-lucide="heart"
                            style="width:16px;height:16px;fill:none"></i></span>
                    <span id="like-count">45</span>
                </button>
            </div>

            <div class="space-y-4">
                <!-- 1. 하드코딩된 '수진'님의 기본 댓글 박스 -->
                <div class="flex gap-4">
                    <div
                        class="w-10 h-10 rounded-full bg-amber-900/20 flex items-center justify-center font-bold text-amber-500 text-xs shrink-0">
                        수진</div>
                    <div class="flex-1 bg-white/5 p-4 rounded-2xl rounded-tl-none border border-white/5">
                        <p class="text-sm text-stone-300 leading-relaxed">이번 호 영상과 디자인이 너무 조화롭네요. 잘 읽었습니다.</p>
                    </div>
                </div>

                <!-- 2. DB에서 동적으로 가져온 실제 댓글들 렌더링 박스 -->
                <?php foreach ($comments as $cmt): ?>
                    <div class="flex gap-4">
                        <div
                            class="w-10 h-10 rounded-full bg-blue-900/20 flex items-center justify-center font-bold text-blue-500 text-xs shrink-0">
                            <!-- 작성자 이름으로 자동 아바타 텍스트 추출 -->
                            <?= htmlspecialchars(mb_substr($cmt['author'], 0, 2, 'UTF-8')) ?>
                        </div>
                        <div class="flex-1 bg-white/5 p-4 rounded-2xl rounded-tl-none border border-white/5">
                            <div class="text-xs text-stone-500 mb-1 font-bold"><?= htmlspecialchars($cmt['author']) ?></div>
                            <p class="text-sm text-stone-300 leading-relaxed">
                                <?= nl2br(htmlspecialchars($cmt['content'])) ?>
                            </p>
                            <div class="text-[10px] text-stone-500 mt-2 text-right">
                                <?= date('y.m.d H:i', strtotime($cmt['created_at'])) ?>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>

            <!-- 댓글 작성을 위한 폼 전송 영역 (Method: POST) -->
            <form method="POST" action="viewer.php?vid=<?= urlencode($vid) ?>"
                class="mt-8 flex flex-col md:flex-row gap-2 items-stretch md:items-center">
                <!-- 백엔드 액션 구분을 위한 hidden input -->
                <input type="hidden" name="action" value="add_comment">

                <!-- 작성자 입력 폼 -->
                <input type="text" name="author" placeholder="닉네임" required
                    class="md:w-32 bg-black/40 border border-white/10 rounded-full px-5 py-3 text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none transition-all placeholder-stone-600" />

                <div class="flex flex-1 gap-2 w-full md:w-auto">
                    <!-- 본문 입력 폼 -->
                    <input type="text" name="content" placeholder="이곳에 따뜻한 마음을 나눠주세요..." required
                        class="flex-1 min-w-0 bg-black/40 border border-white/10 rounded-full px-5 py-3 text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none transition-all placeholder-stone-600" />

                    <button type="submit"
                        class="bg-amber-800 hover:bg-amber-700 text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-amber-900/20 active:scale-95 transition-all shrink-0">
                        전송
                    </button>
                </div>
            </form>
        </div>
    </main>

    <!-- 자바스크립트 로직 영역 -->
    <script>
        // Lucide 아이콘 초기 렌더링 세팅
        lucide.createIcons();

        // 1. 초기 변수 세팅
        const volPages = <?php echo $pagesJson; ?>;
        const vid = "<?php echo htmlspecialchars($vid); ?>";
        const totalPages = volPages.length;

        const pageDisplay = document.getElementById('page-display');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');

        // 뷰어 렌더링을 위한 전역 객체(상태) 선언
        let pageFlip = null;
        let mobileSwiper = null;
        let currentMode = '';

        // 2. 오디오 매니저 (페이드 인/아웃 및 연속 재생 로직)
        const pageAudios = Object.assign({}, <?php echo $pageAudiosJson; ?>);
        const defaultBgm = "<?php echo addslashes($defaultBgm); ?>";

        const AudioManager = {
            playerA: new Audio(),
            playerB: new Audio(),
            bgmPlayer: new Audio(),
            activePlayer: null,
            isPlaying: false,       // 하단 섹션 음성 재생 여부
            isBgmPlaying: true,     // BGM 수동 활성화 상태 (기본 켜짐)
            isBgmDucking: false,    // 플래그: 섹션 음성에 의해 BGM이 볼륨 감쇠(Duck) 중인지
            currentSrc: "",
            fadeInterval: null,
            bgmFadeInterval: null,

            init() {
                this.activePlayer = this.playerA;

                if (defaultBgm) {
                    this.bgmPlayer.src = defaultBgm;
                    this.bgmPlayer.loop = true;
                    this.bgmPlayer.volume = 0.5; // 배경음악은 본래 50% 볼륨으로 잔잔하게
                }

                this.playerA.addEventListener('ended', () => this.onSectionAudioEnded());
                this.playerB.addEventListener('ended', () => this.onSectionAudioEnded());
                this.playerA.addEventListener('pause', () => this.onSectionAudioPaused());
                this.playerB.addEventListener('pause', () => this.onSectionAudioPaused());
                this.playerA.addEventListener('play', () => this.onSectionAudioPlayed());
                this.playerB.addEventListener('play', () => this.onSectionAudioPlayed());

                // 최초 BGM 자동재생 시도 (사용자 상호작용 전일 시 브라우저 정책에 의해 차단될 수 있음)
                if (defaultBgm) {
                    this.bgmPlayer.play().catch(e => {
                        console.log('BGM 자동재생이 차단되었습니다 (클릭 필요):', e);
                        this.isBgmPlaying = false;
                        const bgmIconContainer = document.getElementById('bgm-icon-container');
                        if (bgmIconContainer) bgmIconContainer.innerHTML = '<i data-lucide="volume-x" style="width:14px;height:14px;"></i>';
                        lucide.createIcons();
                    });
                }
            },

            onSectionAudioEnded() {
                this.isPlaying = false;
                const audioIconContainer = document.getElementById('audio-icon-container');
                if (audioIconContainer) audioIconContainer.innerHTML = '<i data-lucide="play" style="width:18px;height:18px;fill:currentColor;margin-left:2px;"></i>';
                lucide.createIcons();
                this.unduckBGM();
            },

            onSectionAudioPaused() {
                if (!this.isPlaying) {
                    this.unduckBGM();
                }
            },

            onSectionAudioPlayed() {
                this.duckBGM();
            },

            duckBGM() {
                if (!this.isBgmPlaying || this.isBgmDucking) return;
                this.isBgmDucking = true;

                if (this.bgmFadeInterval) clearInterval(this.bgmFadeInterval);
                let step = this.bgmPlayer.volume * 20;

                this.bgmFadeInterval = setInterval(() => {
                    step--;
                    this.bgmPlayer.volume = Math.max(0, step / 20);
                    if (step <= 0) {
                        clearInterval(this.bgmFadeInterval);
                        this.bgmPlayer.pause();
                    }
                }, 50);
            },

            unduckBGM() {
                if (!this.isBgmPlaying) return;
                this.isBgmDucking = false;

                this.bgmPlayer.play().catch(e => console.log('BGM 재생 에러:', e));

                if (this.bgmFadeInterval) clearInterval(this.bgmFadeInterval);
                let step = this.bgmPlayer.volume * 40;

                this.bgmFadeInterval = setInterval(() => {
                    step++;
                    this.bgmPlayer.volume = Math.min(0.5, step / 40);
                    if (step >= 20) {
                        clearInterval(this.bgmFadeInterval);
                    }
                }, 50);
            },

            toggleBGM(iconContainer) {
                if (this.isBgmPlaying) {
                    this.isBgmPlaying = false;
                    this.bgmPlayer.pause();
                    iconContainer.innerHTML = '<i data-lucide="volume-x" style="width:14px;height:14px;"></i>';
                } else {
                    this.isBgmPlaying = true;
                    if (this.isPlaying) {
                        this.isBgmDucking = true;
                        this.bgmPlayer.volume = 0;
                        this.bgmPlayer.pause();
                    } else {
                        this.isBgmDucking = false;
                        this.bgmPlayer.volume = 0.5;
                        this.bgmPlayer.play().catch(e => console.log('BGM 재생 에러:', e));
                    }
                    iconContainer.innerHTML = '<i data-lucide="volume-2" style="width:14px;height:14px;"></i>';
                }
                lucide.createIcons();
            },

            // 현재 화면에 양쪽으로 펼쳐진 페이지들 중 가장 마지막으로 등장했던 꼬리표 찾기
            getTrackForCurrentSpread(maxVisibleIndex) {
                let targetIndex = -1;
                for (let i = maxVisibleIndex; i >= 0; i--) {
                    if (pageAudios[i]) {
                        targetIndex = i;
                        break;
                    }
                }
                return targetIndex !== -1 ? pageAudios[targetIndex] : null;
            },

            // 새 트랙으로 음악 전환 (크로스 페이드)
            changeTrack(newSrc, newTitle) {
                if (!newSrc || newSrc === this.currentSrc) return;
                this.currentSrc = newSrc;

                const marqueeText = document.getElementById('marquee-text');
                if (marqueeText) marqueeText.innerText = "🎵 " + newTitle;

                let oldPlayer = this.activePlayer;
                let nextPlayer = (this.activePlayer === this.playerA) ? this.playerB : this.playerA;

                nextPlayer.src = newSrc;
                this.activePlayer = nextPlayer;

                if (this.isPlaying) {
                    nextPlayer.volume = 0;
                    let playPromise = nextPlayer.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(e => console.log('재생 에러:', e));
                    }

                    if (this.fadeInterval) clearInterval(this.fadeInterval);

                    let step = 0;
                    const steps = 20;

                    this.fadeInterval = setInterval(() => {
                        step++;
                        oldPlayer.volume = Math.max(0, 1 - (step / steps));
                        nextPlayer.volume = Math.min(1, step / steps);

                        if (step >= steps) {
                            clearInterval(this.fadeInterval);
                            oldPlayer.pause();
                            oldPlayer.currentTime = 0;
                        }
                    }, 50);
                } else {
                    oldPlayer.pause();
                    oldPlayer.currentTime = 0;
                    nextPlayer.volume = 1;
                }
            },

            togglePlay(uiBtnContainer) {
                if (this.isPlaying) {
                    this.isPlaying = false;
                    this.activePlayer.pause();
                    uiBtnContainer.innerHTML = '<i data-lucide="play" style="width:18px;height:18px;fill:currentColor;margin-left:2px;"></i>';
                } else {
                    this.isPlaying = true;
                    if (this.activePlayer.src) {
                        this.activePlayer.play().catch(e => console.log('재생 에러:', e));
                    }
                    uiBtnContainer.innerHTML = '<i data-lucide="pause" style="width:18px;height:18px;fill:currentColor;"></i>';
                }
                lucide.createIcons();
            }
        };

        AudioManager.init();

        // 3. 플립북 및 슬라이더 반응형 분기 렌더링 로직
        function initViewer() {
            if (totalPages === 0) {
                document.getElementById('desktop-book-wrapper').innerHTML = `<div class="flex items-center justify-center h-full w-full text-stone-500 font-bold">페이지 정보가 없습니다.</div>`;
                document.getElementById('mobile-swiper-wrapper').innerHTML = `<div class="flex items-center justify-center h-full w-full text-stone-500 font-bold">페이지 정보가 없습니다.</div>`;
                if (pageDisplay) pageDisplay.innerText = `Page 0 of 0`;
                return;
            }

            // Tailwind md breakpoint is 768px
            const isMobile = window.innerWidth < 768;

            if (isMobile && currentMode !== 'mobile') {
                currentMode = 'mobile';
                setupMobile();
            } else if (!isMobile && currentMode !== 'desktop') {
                currentMode = 'desktop';
                setupDesktop();
            }
        }

        function setupMobile() {
            // PC 뷰어 제거
            if (pageFlip) {
                pageFlip.destroy();
                pageFlip = null;
                document.getElementById('desktop-book-wrapper').innerHTML = '';
            }
            document.getElementById('desktop-book-wrapper').style.display = 'none';

            // 모바일 컨테이너 표시
            const swiperContainer = document.getElementById('mobile-swiper-container');
            swiperContainer.style.display = 'block';

            // DOM 생성
            const wrapper = document.getElementById('mobile-swiper-wrapper');
            if (wrapper.children.length === 0) {
                wrapper.innerHTML = volPages.map((src, idx) => `
                    <div class="swiper-slide flex items-center justify-center bg-white shadow-lg overflow-hidden border border-black/10">
                        <img src="${vid}/${src}" class="w-full h-full object-contain pointer-events-none select-none" alt="Page ${idx + 1}" />
                    </div>
                `).join('');
            }

            // Swiper 생성
            if (!mobileSwiper) {
                mobileSwiper = new Swiper('#mobile-swiper-container', {
                    effect: 'flip',
                    flipEffect: {
                        slideShadows: true,
                        limitRotation: true
                    },
                    speed: 600,
                    on: {
                        slideChange: function () {
                            updateBookState(this.activeIndex);
                        }
                    }
                });
            } else {
                mobileSwiper.update();
            }

            setTimeout(() => { if (mobileSwiper) updateBookState(mobileSwiper.activeIndex); }, 50);
        }

        function setupDesktop() {
            // 모바일 뷰어 제거
            if (mobileSwiper) {
                mobileSwiper.destroy(true, true);
                mobileSwiper = null;
                document.getElementById('mobile-swiper-wrapper').innerHTML = '';
            }
            document.getElementById('mobile-swiper-container').style.display = 'none';

            // PC 컨테이너 표시
            const desktopContainer = document.getElementById('desktop-book-wrapper');
            desktopContainer.style.display = 'block';

            // DOM 생성
            const pagesHtml = volPages.map((src, idx) => `
                <div class="my-page flex items-center justify-center relative bg-white">
                    <img src="${vid}/${src}" class="w-full h-full object-contain pointer-events-none select-none" alt="Page ${idx + 1}" />
                </div>
            `).join('');
            desktopContainer.innerHTML = pagesHtml;

            // stPageFlip 생성
            pageFlip = new St.PageFlip(desktopContainer, {
                width: 500,
                height: 700,
                size: "stretch",
                minWidth: 300,
                maxWidth: 1000,
                minHeight: 400,
                maxHeight: 1400,
                maxShadowOpacity: 0.3,
                showCover: true,
                usePortrait: false, // PC에서는 무조건 양면
                flippingTime: 800
            });

            pageFlip.loadFromHTML(desktopContainer.querySelectorAll('.my-page'));

            pageFlip.on('flip', (e) => {
                updateBookState(e.data);
            });

            setTimeout(() => { if (pageFlip) updateBookState(pageFlip.getCurrentPageIndex()); }, 100);
        }

        // 페이지 텍스트 변경 및 오디오 시스템 연동
        function updateBookState(pageIndex) {
            let maxVisibleIndex = 0;
            let pageText = "";

            if (currentMode === 'mobile') {
                // 모바일 1장 슬라이드 모드
                pageText = `Page ${pageIndex + 1} of ${totalPages}`;
                maxVisibleIndex = pageIndex;

                if (prevBtn) prevBtn.disabled = (pageIndex === 0);
                if (nextBtn) nextBtn.disabled = (pageIndex >= totalPages - 1);
            } else {
                // PC 양면 보기 모드
                if (pageIndex === 0) {
                    pageText = `Page 1 of ${totalPages}`;
                    maxVisibleIndex = 0;
                } else {
                    let left = pageIndex + 1;
                    let right = pageIndex + 2;
                    if (left > totalPages) left = totalPages;
                    if (right > totalPages) {
                        right = totalPages;
                        if (left === right) {
                            pageText = `Page ${left} of ${totalPages}`;
                        } else {
                            pageText = `Pages ${left} - ${right} of ${totalPages}`;
                        }
                    } else {
                        pageText = `Pages ${left} - ${right} of ${totalPages}`;
                    }
                    maxVisibleIndex = right - 1;
                }

                if (prevBtn) prevBtn.disabled = (pageIndex === 0);
                if (nextBtn) nextBtn.disabled = (pageIndex >= totalPages - 1);
            }

            if (pageDisplay) pageDisplay.innerText = pageText;

            // 오디오 전환 호출
            const track = AudioManager.getTrackForCurrentSpread(maxVisibleIndex);
            if (track) {
                AudioManager.changeTrack(track.src, track.title);
            }
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (currentMode === 'mobile' && mobileSwiper) {
                    mobileSwiper.slidePrev();
                } else if (currentMode === 'desktop' && pageFlip && pageFlip.getCurrentPageIndex() > 0) {
                    pageFlip.flipPrev();
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (currentMode === 'mobile' && mobileSwiper) {
                    mobileSwiper.slideNext();
                } else if (currentMode === 'desktop' && pageFlip && pageFlip.getCurrentPageIndex() < totalPages - 1) {
                    pageFlip.flipNext();
                }
            });
        }

        // 반응형 리사이즈 감지 (PC <-> Mobile 뷰 변경)
        window.addEventListener('resize', () => {
            clearTimeout(window.resizeTimer);
            window.resizeTimer = setTimeout(() => {
                initViewer();
            }, 250);
        });

        // 뷰어 최초 실행
        initViewer();

        // 4. 오디오 플레이어 버튼 이벤트 리스너
        const audioPlayBtn = document.getElementById('audio-play-btn');
        const audioIconContainer = document.getElementById('audio-icon-container');

        if (audioPlayBtn) {
            audioPlayBtn.addEventListener('click', () => {
                AudioManager.togglePlay(audioIconContainer);
            });
        }

        const bgmToggleBtn = document.getElementById('bgm-toggle-btn');
        const bgmIconContainer = document.getElementById('bgm-icon-container');
        if (bgmToggleBtn) {
            bgmToggleBtn.addEventListener('click', () => {
                AudioManager.toggleBGM(bgmIconContainer);
            });
        }

        // 5. 좋아요 버튼 토글 로직
        let liked = false;
        const likeBtn = document.getElementById('like-btn');
        const likeIconContainer = document.getElementById('like-icon-container');
        const likeCount = document.getElementById('like-count');

        if (likeBtn) {
            likeBtn.addEventListener('click', () => {
                liked = !liked;
                if (liked) {
                    likeBtn.classList.replace('text-stone-500', 'text-rose-500');
                    likeIconContainer.innerHTML = '<i data-lucide="heart" style="width:16px;height:16px;fill:currentColor;"></i>';
                    likeCount.innerText = '46';
                } else {
                    likeBtn.classList.replace('text-rose-500', 'text-stone-500');
                    likeIconContainer.innerHTML = '<i data-lucide="heart" style="width:16px;height:16px;fill:none;"></i>';
                    likeCount.innerText = '45';
                }
                lucide.createIcons();
            });
        }
    </script>
</body>

</html>