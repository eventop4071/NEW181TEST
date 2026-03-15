<?php
// PHP 백엔드: 분리된 공통 데이터 파일 불러오기
require_once 'data.php';

// 클라이언트 사이드(JS)에서 사용하기 위해 JSON으로 변환
$volDataJson = json_encode($VOL_DATA);
?>
<!DOCTYPE html>
<html lang="ko">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>월간 181</title>
    <meta property="og:title" content="월간 181">
    <meta property="og:description" content="181구역의 소중한 기록들을 모아놓은 디지털 서재입니다.">
    <meta property="og:image" content="covers/1.jpg">
    <link
        href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=Noto+Serif+KR:wght@400;700&display=swap"
        rel="stylesheet">

    <!-- CSS 영역 -->
    <style>
        :root {
            --shelf-wood: #5d4037;
            --shelf-shadow: #3e2723;
            --bg-color: #f5f5f5;
            --text-color: #333;
        }

        body {
            margin: 0;
            padding: 0;
            background-color: var(--bg-color);
            font-family: 'Gowun Batang', serif;
            color: var(--text-color);
        }

        header {
            text-align: center;
            padding: 50px 20px;
            background: linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('bgm/header_bg.jpg') center/cover;
            color: white;
            min-height: 200px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }

        header h1 {
            font-size: 3rem;
            margin: 0;
            letter-spacing: 5px;
        }

        header p {
            font-size: 1.2rem;
            opacity: 0.9;
            margin-top: 10px;
        }

        .search-container {
            max-width: 600px;
            margin: -30px auto 30px;
            padding: 0 20px;
        }

        #search-input {
            width: 100%;
            padding: 15px 25px;
            border-radius: 30px;
            border: none;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            font-size: 1.1rem;
            outline: none;
        }

        .shelf-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 40px;
        }

        .book-card {
            position: relative;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
            cursor: pointer;
            text-decoration: none;
            color: inherit;
            display: flex;
            flex-direction: column;
        }

        .book-card:hover {
            transform: translateY(-10px);
            box-shadow: 0 20px 35px rgba(0, 0, 0, 0.2);
        }

        .cover-img {
            width: 100%;
            aspect-ratio: 3/4;
            object-fit: cover;
            border-bottom: 2px solid #eee;
        }

        .book-info {
            padding: 20px;
            flex-grow: 1;
        }

        .book-title {
            font-size: 1.4rem;
            font-weight: bold;
            margin-bottom: 8px;
            color: var(--shelf-shadow);
        }

        .book-summary {
            font-size: 0.95rem;
            color: #666;
            line-height: 1.5;
            margin-bottom: 15px;
            height: 4.5em;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
        }

        .tags {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
        }

        .tag {
            font-size: 0.75rem;
            background: #f0f0f0;
            padding: 3px 8px;
            border-radius: 12px;
            color: #888;
        }

        footer {
            text-align: center;
            padding: 50px 20px;
            color: #999;
            font-size: 0.9rem;
        }

        @media (max-width: 600px) {
            header h1 {
                font-size: 2rem;
            }

            .shelf-container {
                grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                gap: 20px;
            }

            .book-info {
                padding: 12px;
            }

            .book-title {
                font-size: 1.1rem;
            }

            .book-summary {
                display: none;
            }
        }
    </style>
</head>

<body>
    <!-- 상단 헤더 영역 -->
    <header>
        <h1>월간 181 서재</h1>
        <p>181구역의 소중한 기록들을 모아놓은 디지털 서재입니다.</p>
    </header>

    <!-- 검색 입력 영역 -->
    <div class="search-container">
        <input type="text" id="search-input" placeholder="검색어를 입력하세요...">
    </div>

    <!-- 책장 렌더링 영역 -->
    <main class="shelf-container" id="shelf"></main>

    <!-- 꼬리말 영역 -->
    <footer>&copy; 181 AREA ARCHIVE.</footer>

    <!-- 자바스크립트 로직 -->
    <script>
        // data.php에서 불러온 연관 배열 데이터를 JSON 형태로 사용
        const VOL_DATA = <?php echo $volDataJson; ?>;

        const shelf = document.getElementById('shelf');
        const searchInput = document.getElementById('search-input');

        function renderBooks(filter = '') {
            shelf.innerHTML = '';
            const query = filter.toLowerCase();

            VOL_DATA.forEach(vol => {
                const searchStr = (vol.title + vol.summary + vol.tags.join(' ')).toLowerCase();

                if (searchStr.includes(query)) {
                    const card = document.createElement('a');

                    // 핵심 변경점: 뷰어에 vid 파라미터를 넘겨서 연결
                    card.href = `viewer.php?vid=${vol.vid}`;
                    card.className = 'book-card';
                    card.innerHTML = `
                        <img src="covers/${vol.cover || '1.jpg'}" class="cover-img" alt="${vol.title} 표지">
                        <div class="book-info">
                            <div class="book-title">${vol.title}</div>
                            <div class="book-summary">${vol.summary}</div>
                            <div class="tags">${vol.tags.map(t => `<span class="tag">#${t}</span>`).join('')}</div>
                        </div>`;
                    shelf.appendChild(card);
                }
            });
        }

        searchInput.addEventListener('input', (e) => renderBooks(e.target.value));

        // 최초 렌더링
        renderBooks();
    </script>
</body>

</html>