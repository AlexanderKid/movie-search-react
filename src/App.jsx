import { useState } from 'react';

const API_KEY = "9cc72804"; 

function App() {
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState([]);

  const searchMovies = async () => {
    const res = await fetch(`https://www.omdbapi.com/?apikey=${API_KEY}&s=${query}`);
    const data = await res.json();
    setMovies(data.Search || []);
  };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>🎬 MOVIE SEARCH APP</h1>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Enter movie title..."
        style={{ padding: '0.5rem', width: '300px' }}
      />
      <button onClick={searchMovies} style={{ marginLeft: '1rem', padding: '0.5rem' }}>
        Search
      </button>

      <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: '2rem', gap: '1rem' }}>
        {movies.map((movie) => (
          <div key={movie.imdbID} style={{ width: '200px' }}>
            <img src={movie.Poster} alt={movie.Title} style={{ width: '100%' }} />
            <h3>{movie.Title}</h3>
            <p>{movie.Year}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;