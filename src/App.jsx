import { useState, useEffect } from 'react';

const API_KEY = "9cc72804";

function App() {
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState([]);

  const searchMovies = async (searchQuery = '') => {
    const res = await fetch(`https://www.omdbapi.com/?apikey=${API_KEY}&s=${searchQuery}`);
    const data = await res.json();
    setMovies(data.Search || []);
  };

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    searchMovies(currentYear.toString());
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans p-6 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-2 ">🎬 Movie Search App</h1>
      <div className="flex gap-2 mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter movie title..."
          className="px-4 py-2 border border-gray-300 rounded shadow w-72 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={() => searchMovies(query)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          Search
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {movies.map((movie) => (
          <div key={movie.imdbID} className="bg-white rounded shadow p-4 flex flex-col items-center">
            <img
              src={movie.Poster !== "N/A" ? movie.Poster : "https://via.placeholder.com/200x300?text=No+Image"}
              alt={movie.Title}
              className="w-full h-72 object-cover rounded mb-4"
            />
            <h3 className="text-lg font-semibold text-center">{movie.Title}</h3>
            <p className="text-gray-500">{movie.Year}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;