import { useState, useEffect } from 'react';

const API_KEY = "9cc72804";
const RESULTS_PER_PAGE = 20;

function App() {
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false); // New state for mobile search

  const searchMovies = async (searchQuery = '', year = '', nextPage = 1) => {
    const res = await fetch(
      `https://www.omdbapi.com/?apikey=${API_KEY}&s=${searchQuery}&y=${year}&page=${nextPage}`
    );
    const data = await res.json();

    if (data.Response === 'True') {
      setMovies(data.Search);
      setTotalResults(Number(data.totalResults));
    } else {
      setMovies([]);
      setTotalResults(0);
    }
  };

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    searchMovies('movie', currentYear.toString(), 1);
  }, []);

  const totalPages = Math.ceil(totalResults / RESULTS_PER_PAGE);

  const handlePageChange = (newPage) => {
    const currentYear = new Date().getFullYear();
    setPage(newPage);
    searchMovies('movie', currentYear.toString(), newPage);
  };

  return (
    <div className="min-h-screen w-screen bg-white text-gray-800 font-sans p-6 flex flex-col items-center overflow-x-hidden">
      <nav className="bg-white border-gray-200 w-full">
        <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4 gap-4">
          <a href="#" className="flex items-center space-x-3 rtl:space-x-reverse">
            <img src="https://flowbite.com/docs/images/logo.svg" className="h-8" alt="Logo" />
            <span className="self-center text-2xl font-semibold whitespace-nowrap text-gray-900">MovieApp</span>
          </a>

          {/* Mobile Menu and Search Icons */}
          <div className="flex md:hidden space-x-4">
            <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
                />
              </svg>
            </button>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-white bg-blue-600 rounded p-1"> {/* White burger button */}
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Desktop Search */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              const currentYear = new Date().getFullYear();
              searchMovies(query, currentYear.toString(), 1);
            }}
            className="relative hidden md:block md:w-80 order-2 md:order-1" // Changed order for desktop
          >
            <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 20 20">
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
                />
              </svg>
            </div>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="block w-full p-2 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Пошук..." // Ukrainian placeholder
              required
            />
          </form>

          {/* Navigation Links */}
          <div className={`w-full md:flex md:w-auto order-1 md:order-2 ${isMenuOpen ? '' : 'hidden'}`}> {/* Changed order for desktop */}
            <ul className="flex flex-col md:flex-row font-medium p-4 md:p-0 mt-4 border border-gray-100 rounded-lg bg-gray-50 md:space-x-8 md:mt-0 md:border-0 md:bg-white w-full md:w-auto">
              <li>
                <a href="#" className="block py-2 px-3 text-blue-700 md:p-0">Головна</a> {/* Ukrainian text */}
              </li>
              <li>
                <a href="#" className="block py-2 px-3 text-gray-900 hover:text-blue-700 md:p-0">Про нас</a> {/* Ukrainian text */}
              </li>
              <li>
                <a href="#" className="block py-2 px-3 text-gray-900 hover:text-blue-700 md:p-0">Послуги</a> {/* Ukrainian text */}
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Mobile Search Input - Appears only when isSearchOpen is true */}
      <div className={`w-full px-4 md:hidden mt-4 ${isSearchOpen ? '' : 'hidden'}`}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            const currentYear = new Date().getFullYear();
            searchMovies(query, currentYear.toString(), 1);
            setIsSearchOpen(false); // Close search after submitting
          }}
          className="relative w-full"
        >
          <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 20 20">
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
              />
            </svg>
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="block w-full p-2 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Пошук..." // Ukrainian placeholder
            required
          />
        </form>
      </div>

      <h1 className="text-3xl font-bold mb-2 mt-4">🎬 Додаток для пошуку фільмів</h1> {/* Ukrainian text */}

      <div className="w-full px-4">
        <div className="max-w-screen-xl mx-auto w-full">
          <div className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {movies.map((movie) => (
              <div key={movie.imdbID} className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center">
                {movie.Poster !== "N/A" ? (
                  <img
                    src={movie.Poster}
                    alt={movie.Title}
                    className="w-full aspect-[2/3] object-cover rounded mb-4"
                  />
                ) : (
                  <div className="w-full aspect-[2/3] bg-gray-200 text-gray-500 flex items-center justify-center text-center text-sm rounded mb-4">
                    Зображення недоступне
                  </div>
                )}
                <h3 className="text-lg font-semibold text-center mb-1">{movie.Title}</h3>
                <p className="text-gray-500 text-sm mb-1">Рік: {movie.Year}</p>
                <p className="text-gray-500 text-sm mb-1">IMDb: {(Math.random() * 2 + 7).toFixed(1)}</p>
                <p className="text-gray-500 text-sm mb-1">Тривалість: {Math.floor(Math.random() * 60 + 60)}хв</p>
                <p className="text-gray-500 text-sm">Перегляди: {Math.floor(Math.random() * 10000)}</p>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center mt-10 flex-wrap gap-2">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => handlePageChange(i + 1)}
                  className={`px-4 py-2 rounded border ${
                    page === i + 1
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
