const form = document.getElementById('movie-form');
const movieList = document.getElementById('movie-list');
const genreSelect = document.getElementById('genre-select');
const suggestBtn = document.getElementById('suggest-btn');
const suggestionResult = document.getElementById('suggestion-result');
const watchedList = document.getElementById('watched-list');


let movies = JSON.parse(localStorage.getItem('movies')) || [];
let editIndex = null;

const OMDB_API_KEY = '4b7d9063'; // paste your real OMDb key here

async function fetchMovieData(title) {
  try {
    const response = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${OMDB_API_KEY}`);
    const data = await response.json();

    if (data.Response === 'True') {
      return {
        poster: data.Poster !== 'N/A' ? data.Poster : '',
        genre: data.Genre !== 'N/A' ? data.Genre : 'Unknown',
        summary: data.Plot !== 'N/A' ? data.Plot : ''
      };
    } else {
      return { poster: '', genre: 'Unknown', summary: '' };
    }
  } catch (error) {
    console.error('Movie data fetch failed:', error);
    return { poster: '', genre: 'Unknown', summary: '' };
  }
}

form.addEventListener('submit', async function (event) {
  event.preventDefault();

  const title = document.getElementById('title').value;
  const movieInfo = await fetchMovieData(title);

  const movieData = {
    title,
    genre: movieInfo.genre,
    poster: movieInfo.poster,
    summary: movieInfo.summary,
    watched: false,
    watchedDate: null
  };

  movies.push(movieData);
  localStorage.setItem('movies', JSON.stringify(movies));

  form.reset();
  renderMovies();
  updateGenreDropdown();
});

function renderMovies() {
  movieList.innerHTML = '';
  watchedList.innerHTML = '';

  movies.forEach(function (movie, index) {
    const card = document.createElement('div');
    card.className = 'movie-card';

    if (movie.watched) {
      card.innerHTML = `
        ${movie.poster ? `<img src="${movie.poster}" class="poster" alt="${movie.title} poster">` : ''}
        <h3>${movie.title}</h3>
        <p class="genre-tag">${movie.genre}</p>
        <p class="watched-date">Watched on ${movie.watchedDate}</p>
        <button onclick="deleteMovie(${index})">Delete</button>
      `;
      watchedList.appendChild(card);
    } else {
      card.innerHTML = `
        ${movie.poster ? `<img src="${movie.poster}" class="poster" alt="${movie.title} poster">` : ''}
        <h3>${movie.title}</h3>
        <p class="genre-tag">${movie.genre}</p>
        ${movie.summary ? `<p class="summary">${movie.summary}</p>` : ''}
        <button onclick="markWatched(${index})">Watched</button>
        <button onclick="deleteMovie(${index})">Delete</button>
      `;
      movieList.appendChild(card);
    }
  });
}

function markWatched(index) {
  movies[index].watched = true;
  movies[index].watchedDate = new Date().toLocaleDateString();
  localStorage.setItem('movies', JSON.stringify(movies));
  renderMovies();
}

function deleteMovie(index) {
  movies.splice(index, 1);
  localStorage.setItem('movies', JSON.stringify(movies));
  renderMovies();
  updateGenreDropdown();
}

function editMovie(index) {
  const movie = movies[index];
  document.getElementById('title').value = movie.title;
  editIndex = index;
  form.querySelector('button[type="submit"]').textContent = 'Update Movie';
}

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

renderMovies();
updateGenreDropdown();