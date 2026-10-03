const form = document.getElementById('movie-form');
const movieList = document.getElementById('movie-list');
const watchedList = document.getElementById('watched-list');
const genreSelect = document.getElementById('genre-select');
const suggestBtn = document.getElementById('suggest-btn');
const suggestionResult = document.getElementById('suggestion-result');

let movies = []; // now just an in-memory copy of what's in Firestore

const OMDB_API_KEY = '4b7d9063';

// Wait until the Firebase script above has run and attached window.db
function getDB() {
  return window.db;
}

async function fetchMovieData(rawTitle) {
  const yearMatch = rawTitle.match(/\((\d{4})\)/);
  const year = yearMatch ? yearMatch[1] : '';
  const cleanTitle = rawTitle.replace(/\s*\(\d{4}\)\s*/, '').trim();

  try {
    let url = `https://www.omdbapi.com/?t=${encodeURIComponent(cleanTitle)}&apikey=${OMDB_API_KEY}`;
    if (year) url += `&y=${encodeURIComponent(year)}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.Response === 'True') {
      return {
        title: data.Title,
        poster: data.Poster !== 'N/A' ? data.Poster : '',
        genre: data.Genre !== 'N/A' ? data.Genre : 'Unknown',
        summary: data.Plot !== 'N/A' ? data.Plot : ''
      };
    } else {
      return { title: cleanTitle, poster: '', genre: 'Unknown', summary: '' };
    }
  } catch (error) {
    console.error('Movie data fetch failed:', error);
    return { title: cleanTitle, poster: '', genre: 'Unknown', summary: '' };
  }
}

// Load all movies from Firestore into the `movies` array
async function loadMovies() {
  const db = getDB();
  const { collection, getDocs } = window.fb;

  const snapshot = await getDocs(collection(db, 'movies'));
  movies = [];
  snapshot.forEach((docSnap) => {
    movies.push({ id: docSnap.id, ...docSnap.data() });
  });

  renderMovies();
  updateGenreDropdown();
}

form.addEventListener('submit', async function (event) {
  event.preventDefault();

  const rawTitle = document.getElementById('title').value;
  const movieInfo = await fetchMovieData(rawTitle);

  const movieData = {
    title: movieInfo.title,
    genre: movieInfo.genre,
    poster: movieInfo.poster,
    summary: movieInfo.summary,
    watched: false,
    watchedDate: null
  };

  const db = getDB();
  const { collection, addDoc } = window.fb;
  await addDoc(collection(db, 'movies'), movieData);

  form.reset();
  await loadMovies(); // reload fresh list from Firestore
});

function renderMovies() {
  movieList.innerHTML = '';
  watchedList.innerHTML = '';

  movies.forEach(function (movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';

    if (movie.watched) {
      card.innerHTML = `
        ${movie.poster ? `<img src="${movie.poster}" class="poster" alt="${movie.title} poster">` : ''}
        <h3>${movie.title}</h3>
        <p class="genre-tag">${movie.genre}</p>
        <p class="watched-date">Watched on ${movie.watchedDate}</p>
        <button onclick="deleteMovie('${movie.id}')">Delete</button>
      `;
      watchedList.appendChild(card);
    } else {
      card.innerHTML = `
        ${movie.poster ? `<img src="${movie.poster}" class="poster" alt="${movie.title} poster">` : ''}
        <h3>${movie.title}</h3>
        <p class="genre-tag">${movie.genre}</p>
        ${movie.summary ? `<p class="summary">${movie.summary}</p>` : ''}
        <button onclick="markWatched('${movie.id}')">Watched</button>
        <button onclick="deleteMovie('${movie.id}')">Delete</button>
      `;
      movieList.appendChild(card);
    }
  });
}

async function deleteMovie(id) {
  const db = getDB();
  const { doc, deleteDoc } = window.fb;
  await deleteDoc(doc(db, 'movies', id));
  await loadMovies();
}

async function markWatched(id) {
  const db = getDB();
  const { doc, updateDoc } = window.fb;
  await updateDoc(doc(db, 'movies', id), {
    watched: true,
    watchedDate: new Date().toLocaleDateString()
  });
  await loadMovies();
}

// Make these callable from the inline onclick= in the HTML
window.deleteMovie = deleteMovie;
window.markWatched = markWatched;

function updateGenreDropdown() {
  const allGenres = movies.flatMap(movie => movie.genre.split(',').map(g => g.trim()));
  const uniqueGenres = [...new Set(allGenres)];

  genreSelect.innerHTML = '<option value="">Suggest by genre...</option>';

  uniqueGenres.forEach(function (genre) {
    const option = document.createElement('option');
    option.value = genre;
    option.textContent = genre;
    genreSelect.appendChild(option);
  });
}

suggestBtn.addEventListener('click', function () {
  const selectedGenre = genreSelect.value;

  if (!selectedGenre) {
    suggestionResult.textContent = 'Pick a genre first!';
    return;
  }

  const matches = movies.filter(function (movie) {
    return movie.genre.toLowerCase().includes(selectedGenre.toLowerCase());
  });

  if (matches.length === 0) {
    suggestionResult.textContent = 'No movies match that genre yet.';
    return;
  }

  const randomMovie = matches[Math.floor(Math.random() * matches.length)];
  suggestionResult.textContent = `Watch: ${randomMovie.title}`;
});

// Initial load
loadMovies();