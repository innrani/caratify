document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('#topTracks').addEventListener('click', () => {
        window.location.href = '/top-tracks';
    });

    document.querySelector('#topArtists').addEventListener('click', () => {
        window.location.href = '/top-artists';
    });

    document.querySelector('#topAlbums').addEventListener('click', () => {
        window.location.href = '/top-albums';
    });
});