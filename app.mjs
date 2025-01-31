export const indexPage = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="CARAT-IFY - Your Personal SEVENTEEN Spotify Stats">
    <meta name="keywords" content="SEVENTEEN, K-pop, Music Stats, Carat">
    <meta name="author" content="CARAT-IFY">
    <meta property="og:title" content="CARAT-IFY">
    <meta property="og:description" content="Discover your SEVENTEEN listening stats on Spotify">
    <meta property="og:image" content="https://i.imgur.com/6Vbo1FS.png">
    <meta property="og:url" content="https://caratify-964b2a7e01d7.herokuapp.com">
    <meta name="theme-color" content="#92A8D1">
    <title>CARAT-IFY</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="landing-container">
        <div class="title-container">
            <img src="https://i.ibb.co/VL8fTGK/tumblr-f3f85e3974438480c3aa10e0601562c6-09be720b-540.png" alt="Spotify Stats Icon" class="title-icon">
            <h1>Your CARAT-IFY</h1>
        </div>
        <div class="button-container">
            <button class="stat-button" id="top-songs-btn" data-category="top-songs">Top Songs</button>
            <button class="stat-button" id="top-albums-btn" data-category="top-albums">Top Albums</button>
            <button class="stat-button" id="artist-rank-btn" data-category="artist-rank">Artist Ranking</button>
            <button class="stat-button" onclick="window.open('https://www.seventeen-17.com', '_blank')">Quiz... just for fun</button>
        </div>
        <div class="copyright">© CARAT-IFY</div>
    </div>

    <div id="stats-display" class="hidden"></div>

    <script type="module" src="app.mjs" defer></script>
</body>
</html>
`;
