<?php
// data.php
// 공통 데이터 포맷: 각 호수별 정보를 PHP 연관 배열로 관리합니다.
// bgm: 기본 무한 루프 배경음악 (상단 컨트롤러 연동, Auto-Ducking 대상)
// page_audios: 특정 페이지(인덱스 기준) 전용 음성 (하단 플레이어, 재생 시 BGM Ducking)

$VOL_DATA = [
    [
        "vid" => "vol1",
        "title" => "2025년 12월호 (창간호)",
        "tags" => ["창간", "기드온", "항아리"],
        "summary" => "기드온 300용사:시선의 전환.",
        "pages" => ["1 (1).jpg", "1 (2).jpg", "1 (3).jpg", "1 (4).jpg", "1 (5).jpg", "1 (6).jpg", "1 (7).jpg", "1 (8).jpg", "1 (9).jpg", "1 (10).jpg", "1 (11).jpg", "1 (12).jpg", "1 (13).jpg", "1 (14).jpg", "1 (15).jpg"],
        "cover" => "1.jpg",
        "bgm" => "bgm/vol1.mp3",
        "page_audios" => [
            "0" => ["src" => "audios/vol1.mp3", "title" => "항아리를 깨뜨려라"],
            "15" => ["src" => "audios/vol1-2.mp3", "title" => "두번쨰이야기"],
            "20" => ["src" => "audios/vol1-3.mp3", "title" => " 세번째"]
        ]
    ],
    [
        "vid" => "vol2",        "title" => "2026년 1월호 (신년호)",
        "tags" => ["신년", "결심", "구별"],
        "summary" => "세상과 구별.",
        "pages" => ["1.jpg", "2.jpg", "3.jpg", "5.jpg", "6.jpg", "7.jpg", "8.jpg", "9.jpg", "10.jpg", "11.jpg", "12.jpg", "13.jpg", "14.jpg", "15.jpg", "16.jpg", "17.jpg", "18.jpg", "19.jpg", "20.jpg"],
        "cover" => "2.jpg",
        "bgm" => "bgm/vol2.mp3",
        "page_audios" => [
            "0" => ["src" => "audios/vol2.mp3", "title" => "01. 김집사님의 고백 - 신년호"],
            "5" => ["src" => "audios/vol2-2.mp3", "title" => "02. 구별된 자의 길"],
            "12" => ["src" => "audios/vol2-3.mp3", "title" => "03. 새로운 다짐, 2026"]
        ]
    ],
    [
        "vid" => "vol3",
        "title" => "2026년 2월호",
        "tags" => ["아버지", "마음", "아버지의마음"],
        "summary" => "요나서로 보는 하나님의 마음.",
        "pages" => ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg", "6.jpg", "7.jpg", "8.jpg", "9.jpg", "10.jpg", "11.jpg", "12.jpg", "13.jpg", "14.jpg", "15.jpg", "16.jpg", "17.jpg", "18.jpg", "19.jpg", "20.jpg", "21.jpg"],
        "cover" => "3.jpg",
        "bgm" => "bgm/vol3.mp3",
        "page_audios" => [
            "0" => ["src" => "audios/vol3.mp3", "title" => "아버지의 마음_하문기전도사"],
            "22" => ["src" => "audios/vol3-2.mp3", "title" => "간증"],
            "30" => ["src" => "audios/vol3-3.mp3", "title" => "기도부탁"]
        ]
    ],
    [
        "vid" => "vol4",
        "title" => "vol4",
        "tags" => [],
        "summary" => "Comming soon",
        "pages" => ["1.jpg"],
        "cover" => "4.jpg",
        "bgm" => "",
        "page_audios" => []
    ]
];
?>