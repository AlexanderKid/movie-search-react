import { useState, useEffect, useRef } from 'react';

const API_KEY = "9cc72804"; // Повернуто до старого OMDB API Key
const RESULTS_PER_PAGE = 8; // Змінено на 8 фільмів на сторінку

function App() {
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState([]);
  const [displayedMovies, setDisplayedMovies] = useState([]); // Стан для відсортованих фільмів
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null); // Стан для обраного фільму (деталі)
  const [showDetails, setShowDetails] = useState(false); // Стан для показу детального опису
  const [showSortOptions, setShowSortOptions] = useState(false); // Стан для відображення опцій сортування
  const [sortOption, setSortOption] = useState('none'); // 'none', 'year', 'genre', 'imdbRating'
  const [cardRotations, setCardRotations] = useState({}); // Стан для зберігання поточної ротації кожної картки
  const [initialCardRotations, setInitialCardRotations] = useState({}); // Стан для зберігання початкової ротації кожної картки
  const [isMobile, setIsMobile] = useState(false); // Стан для визначення мобільного пристрою

  const detailsRef = useRef(null); // Створення ref для детального опису

  // Ефект для визначення мобільного пристрою
  useEffect(() => {
    const checkIsMobile = () => {
      // Вважаємо мобільним, якщо ширина екрану менше 930px (брейкпойнт для бургер меню)
      setIsMobile(window.innerWidth < 930);
    };

    checkIsMobile(); // Початкова перевірка при завантаженні компонента
    window.addEventListener('resize', checkIsMobile); // Додаємо слухача подій зміни розміру вікна
    return () => window.removeEventListener('resize', checkIsMobile); // Очищення слухача при демонтажі компонента
  }, []);


  const searchMovies = async (searchQuery = '', year = '', nextPage = 1) => {
    setLoading(true);
    const actualSearchQuery = searchQuery || 'movie';

    try {
      const res = await fetch(
        `https://www.omdbapi.com/?apikey=${API_KEY}&s=${actualSearchQuery}&y=${year}&page=${nextPage}`
      );
      const data = await res.json();

      if (data.Response === 'True') {
        const fetchedMovies = data.Search.slice(0, RESULTS_PER_PAGE);
        const enrichedMoviesPromises = fetchedMovies.map(async (movie) => {
          try {
            const detailRes = await fetch(
              `https://www.omdbapi.com/?apikey=${API_KEY}&i=${movie.imdbID}&plot=full`
            );
            const detailData = await detailRes.json();
            if (detailData.Response === 'True') {
              return {
                ...movie,
                Genre: detailData.Genre,
                imdbRating: detailData.imdbRating,
                Runtime: detailData.Runtime
              };
            }
          } catch (detailError) {
            console.error("Error fetching detail for movie:", movie.imdbID, detailError);
          }
          return movie; // Повернути оригінальний фільм, якщо отримання деталей не вдалося
        });

        const fullyEnrichedMovies = await Promise.all(enrichedMoviesPromises);
        setMovies(fullyEnrichedMovies);
        setTotalResults(Number(data.totalResults)); // Все ще базується на початковому пошуку

        // Ініціалізуємо випадкові ротації для нових карток
        const newInitialRotations = {};
        fullyEnrichedMovies.forEach(movie => {
          newInitialRotations[movie.imdbID] = getRandomRotation();
        });
        setInitialCardRotations(newInitialRotations);
        setCardRotations(newInitialRotations); // Встановлюємо початкові ротації також для відображення

      } else {
        setMovies([]);
        setTotalResults(0);
        console.error("OMDB API Error:", data.Error);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setMovies([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchMovieDetails = async (imdbID) => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://www.omdbapi.com/?apikey=${API_KEY}&i=${imdbID}&plot=full`
      );
      const data = await res.json();
      if (data.Response === 'True') {
        setSelectedMovie(data);
        // showDetails тепер встановлюється в handleMovieClick після завершення завантаження
        return data; // Повертаємо дані для використання в handleMovieClick
      } else {
        console.error("Failed to fetch movie details:", data.Error);
        setSelectedMovie(null);
        setShowDetails(false);
        return null;
      }
    } catch (error) {
      console.error("Error fetching movie details:", error);
      setSelectedMovie(null);
      setShowDetails(false);
      return null;
    } finally {
      setLoading(false); // Завантаження завершено
    }
  };

  const handleMovieClick = async (movie) => { // Зроблено асинхронною
    const details = await fetchMovieDetails(movie.imdbID); // Чекаємо завантаження деталей
    if (details) {
      setShowDetails(true); // Тепер запускаємо анімацію після завантаження
      setTimeout(() => {
          if (detailsRef.current) {
              detailsRef.current.scrollTop = 0; // Прокручуємо вміст модального вікна до верху
          }
      }, 100);
    }
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setTimeout(() => setSelectedMovie(null), 700);
  };

  // Функція для застосування сортування
  const applySorting = (moviesToSort, currentSortOption) => {
    if (currentSortOption === 'none') {
      return moviesToSort;
    }

    const sorted = [...moviesToSort].sort((a, b) => {
      if (currentSortOption === 'year') {
        const yearA = parseInt(a.Year) || 0;
        const yearB = parseInt(b.Year) || 0;
        return yearB - yearA; // За роком (спадання, новіші першими)
      } else if (currentSortOption === 'genre') {
        const genreA = a.Genre || '';
        const genreB = b.Genre || '';
        return genreA.localeCompare(genreB); // За жанром (алфавітний порядок)
      } else if (currentSortOption === 'imdbRating') {
        const ratingA = parseFloat(a.imdbRating) || 0; // Обробка 'N/A' або відсутніх значень
        const ratingB = parseFloat(b.imdbRating) || 0;
        return ratingB - ratingA; // За популярністю (найвищий рейтинг першим)
      }
      return 0; // Без сортування
    });
    return sorted;
  };

  useEffect(() => {
    searchMovies('movie', '', 1);
  }, []);

  // Ефект для застосування сортування при зміні фільмів або опції сортування
  useEffect(() => {
    setDisplayedMovies(applySorting(movies, sortOption));
  }, [movies, sortOption]);

  // Обмеження загальної кількості сторінок до 100 результатів OMDB API
  const totalPages = Math.min(Math.ceil(totalResults / RESULTS_PER_PAGE), Math.ceil(100 / RESULTS_PER_PAGE));

  const handlePageChange = (newPage) => {
    if (newPage === '...') return;
    setPage(newPage);
    searchMovies(query, '', newPage);
  };

  const getPageNumbers = () => {
    const pageNumbers = [];
    const delta = 2;
    const range = [];

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
        range.push(i);
      }
    }

    let lastAdded = 0;
    for (let i of range) {
      if (lastAdded) {
        if (i - lastAdded === 2) {
          pageNumbers.push(lastAdded + 1);
        } else if (i - lastAdded !== 1) {
          pageNumbers.push('...');
        }
      }
      pageNumbers.push(i);
      lastAdded = i;
    }
    return pageNumbers;
  };

  // Висоти для динамічного padding-top
  const navHeight = 72; // Приблизна висота навігації
  const sortOptionsBlockHeight = 48; // Приблизна висота блоку сортування при видимості (ви можете налаштувати це значення)
  const dynamicPaddingTop = showSortOptions ? navHeight + sortOptionsBlockHeight : navHeight;

  const handleSort = (type) => {
    setSortOption(type);
    setShowSortOptions(false); // Закрити опції сортування після вибору
  };

  // Функція для генерації випадкового нахилу (діапазон збільшено для кращої помітності)
  const getRandomRotation = () => {
    const randomDegree = Math.floor(Math.random() * 31) - 15; // Від -15 до 15 градусів
    return `rotate(${randomDegree}deg)`;
  };

  // Обробники подій наведення для карток
  const handleMouseEnter = (imdbID) => {
    // Застосовуємо ротацію до 0deg лише якщо це не мобільний пристрій
    if (!isMobile) {
      setCardRotations(prevRotations => ({
        ...prevRotations,
        [imdbID]: 'rotate(0deg)'
      }));
    }
  };

  const handleMouseLeave = (imdbID) => {
    // Відновлюємо початкову ротацію лише якщо це не мобільний пристрій
    if (!isMobile) {
      setCardRotations(prevRotations => ({
        ...prevRotations,
        [imdbID]: initialCardRotations[imdbID]
      }));
    }
  };

  return (
    <div className="min-h-screen w-screen bg-white text-gray-800 font-sans flex flex-col items-center overflow-x-hidden select-none">
      <nav className={`bg-white border-gray-200 w-full fixed top-0 left-0 right-0 z-40 ${showSortOptions ? '' : 'shadow-md'}`}> {/* Фіксована навігація, тінь тільки коли сортування не показано */}
        <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4 gap-4">
          <a href="#" className="flex items-center space-x-3 rtl:space-x-reverse">
            <svg
              className="h-8 w-8 text-blue-600"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M22 6h-2V4c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v2H2c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2 14H4V8h16v12zM9 10h6v2H9v-2zm0 4h6v2H9v-2z"/>
              <circle cx="7" cy="11" r="1.5"/>
              <circle cx="17" cy="11" r="1.5"/>
              <circle cx="7" cy="15" r="1.5"/>
              <circle cx="17" cy="15" r="1.5"/>
            </svg>
            <span className="self-center text-2xl font-semibold whitespace-nowrap text-gray-900">MovieApp</span>
          </a>

          {/* Mobile Menu Icon (Hamburger) - hidden on screens >= 930px */}
          <div className="flex min-[930px]:hidden">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-blue-600 rounded p-1 border border-gray-300 bg-transparent focus:outline-none">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Desktop Search and Navigation Links - visible on screens >= 930px, hidden by default for mobile */}
          <div className={`w-full min-[930px]:flex min-[930px]:w-auto min-[930px]:order-2 ${isMenuOpen ? '' : 'hidden'}`}>
            <ul className="flex flex-col min-[930px]:flex-row font-medium p-4 min-[930px]:p-0 mt-4 rounded-lg bg-white min-[930px]:space-x-8 min-[930px]:mt-0 min-[930px]:border-0 min-[930px]:bg-white w-full min-[930px]:w-auto">
              {/* Mobile Search Input - Appears inside the menu when open on small screens */}
              <li className="min-[930px]:hidden mb-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setPage(1);
                    searchMovies(query, '', 1);
                    setIsMenuOpen(false);
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
                    className="block w-full p-2 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                    placeholder="Пошук..."
                    required
                  />
                </form>
              </li>
              <li>
                <a href="#" className="block py-2 px-3 text-blue-700 min-[930px]:p-0 focus:outline-none">Головна</a>
              </li>
              <li>
                <a href="#" className="block py-2 px-3 text-gray-900 hover:text-blue-700 min-[930px]:p-0 focus:outline-none">Про нас</a>
              </li>
              <li>
                <button
                  onClick={() => {
                    setShowSortOptions(!showSortOptions);
                    setIsMenuOpen(false);
                  }}
                  className="block py-2 px-3 text-gray-900 hover:text-blue-700 min-[930px]:p-0 bg-transparent border-0 focus:outline-none"
                >
                  Сортувати
                </button>
              </li>
            </ul>
          </div>

          {/* Desktop Search - hidden on screens < 930px */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              searchMovies(query, '', 1);
            }}
            className="relative hidden min-[930px]:block min-[930px]:w-80 min-[930px]:order-1"
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
              className="block w-full p-2 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
              placeholder="Пошук..."
              required
            />
          </form>
        </div>
      </nav>

      {/* Блок опцій сортування */}
      <div className={`
        fixed left-0 right-0 bg-white z-30 overflow-hidden
        ${showSortOptions ? 'max-h-40 opacity-100 py-2 shadow-md transition-all duration-300 ease-in-out' : 'max-h-0 opacity-0 pointer-events-none'}
      `} style={{ top: `${navHeight - 2}px` }}>
        <div className="max-w-screen-xl mx-auto flex flex-col items-start min-[930px]:flex-row min-[930px]:justify-center min-[930px]:space-x-8 px-4">
          <button
            onClick={() => handleSort('year')}
            className="block px-4 py-2 text-gray-900 hover:text-blue-700 w-full text-left min-[930px]:w-auto min-[930px]:text-center rounded-lg bg-transparent border-0 focus:outline-none"
          >
            За роком (новими)
          </button>
          <button
            onClick={() => handleSort('genre')}
            className="block px-4 py-2 text-gray-900 hover:text-blue-700 w-full text-left min-[930px]:w-auto min-[930px]:text-center rounded-lg bg-transparent border-0 focus:outline-none"
          >
            За жанром (А-Я)
          </button>
          <button
            onClick={() => handleSort('imdbRating')}
            className="block px-4 py-2 text-gray-900 hover:text-blue-700 w-full text-left min-[930px]:w-auto min-[930px]:text-center rounded-lg bg-transparent border-0 focus:outline-none"
          >
            За популярністю (IMDb)
          </button>
        </div>
      </div>

      {/* Основний вміст, що росте для прикріплення футера */}
      <div className="w-full px-4 flex-grow transition-all duration-300 ease-in-out" style={{ paddingTop: `${dynamicPaddingTop}px` }}>
        <div className="max-w-screen-xl mx-auto w-full">
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="w-16 h-16 rounded-full bg-blue-600 animate-pulse"></div>
            </div>
          ) : null}

          {/* Детальний опис фільму - тепер з'являється по центру сторінки як модальне вікно */}
          {selectedMovie && (
            <div className={`
              fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4
              transition-opacity duration-700 ease-in-out
              ${showDetails ? 'opacity-100' : 'opacity-0 pointer-events-none'}
            `}>
              <div ref={detailsRef} className={`
                bg-white rounded-lg shadow-2xl p-6 min-[930px]:p-8 lg:p-10 w-full max-w-screen-md mx-auto relative
                transform transition-all duration-700 ease-in-out max-h-[90vh] overflow-y-auto
                ${showDetails ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
              `}>
                <div className="flex justify-end mb-4">
                  <button
                    onClick={handleCloseDetails}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none"
                  >
                    Закрити
                  </button>
                </div>
                <div className="flex flex-col min-[930px]:flex-row items-start gap-6">
                  <div className="flex-shrink-0 w-full min-[930px]:w-auto flex justify-center">
                    {selectedMovie.Poster !== "N/A" ? (
                      <img
                        src={selectedMovie.Poster}
                        alt={selectedMovie.Title}
                        className="w-48 h-auto object-cover rounded-lg shadow-lg min-[930px]:w-64"
                      />
                    ) : (
                      <img
                        src="https://placehold.co/200x300/2563EB/FFFFFF?text=Постер+недоступний"
                        alt="Постер недоступний"
                        className="w-48 h-auto object-cover rounded-lg shadow-lg min-[930px]:w-64"
                      />
                    )}
                  </div>
                  <div className="flex-grow">
                    <h2 className="text-3xl font-bold mb-2 text-gray-900">{selectedMovie.Title} ({selectedMovie.Year})</h2>
                    <p className="text-gray-700 text-lg mb-2">
                      <span className="font-semibold">Рейтинг IMDb:</span> {selectedMovie.imdbRating || 'N/A'}
                    </p>
                    <p className="text-gray-700 text-lg mb-2">
                      <span className="font-semibold">Жанр:</span> {selectedMovie.Genre || 'N/A'}
                    </p>
                    <p className="text-gray-700 text-lg mb-2">
                      <span className="font-semibold">Тривалість:</span> {selectedMovie.Runtime || 'N/A'}
                    </p>
                    <p className="text-gray-700 text-lg mb-2">
                      <span className="font-semibold">Режисер:</span> {selectedMovie.Director || 'N/A'}
                    </p>
                    <p className="text-gray-700 text-lg mb-2">
                      <span className="font-semibold">Сценарій:</span> {selectedMovie.Writer || 'N/A'}
                    </p>
                    <p className="text-gray-700 text-lg mb-2">
                      <span className="font-semibold">Актори:</span> {selectedMovie.Actors || 'N/A'}
                    </p>
                    <p className="text-gray-700 text-lg mb-4">
                      <span className="font-semibold">Сюжет:</span> {selectedMovie.Plot || 'N/A'}
                    </p>
                    <p className="text-gray-700 text-lg mb-2">
                      <span className="font-semibold">Нагороди:</span> {selectedMovie.Awards || 'N/A'}
                    </p>
                    <p className="text-gray-700 text-lg mb-2">
                      <span className="font-semibold">Мова:</span> {selectedMovie.Language || 'N/A'}
                    </p>
                    <p className="text-gray-700 text-lg mb-2">
                      <span className="font-semibold">Країна:</span> {selectedMovie.Country || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Сітка фільмів - тепер банери, прихована, коли відображаються деталі */}
          {!loading && displayedMovies.length > 0 && !showDetails ? (
            <div className="grid w-full grid-cols-1 sm:grid-cols-2 min-[930px]:grid-cols-3 lg:grid-cols-4 gap-6 relative justify-items-center items-start">
              {displayedMovies.map((movie) => (
                <div
                  key={movie.imdbID}
                  className="group relative bg-white rounded-lg shadow-md cursor-pointer flex flex-col overflow-hidden
                             transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl hover:z-10"
                  // Застосовуємо ротацію лише якщо це не мобільний пристрій
                  style={{ transform: isMobile ? 'rotate(0deg)' : cardRotations[movie.imdbID] }}
                  onMouseEnter={() => handleMouseEnter(movie.imdbID)}
                  onMouseLeave={() => handleMouseLeave(movie.imdbID)}
                  onClick={() => handleMovieClick(movie)}
                >
                  {/* Image Section - always visible */}
                  {movie.Poster !== "N/A" ? (
                    <img
                      src={movie.Poster}
                      alt={movie.Title}
                      className="w-full aspect-[2/3] object-cover rounded-t-lg"
                    />
                  ) : (
                    <img
                      src="https://placehold.co/200x300/2563EB/FFFFFF?text=Постер+недоступний"
                      alt="Постер недоступний"
                      className="w-full aspect-[2/3] object-cover rounded-t-lg"
                    />
                  )}
                  {/* Опис фільму для мобільних пристроїв - знаходиться під зображенням */}
                  <div className="p-4 bg-white rounded-b-lg text-gray-800 min-[930px]:hidden">
                    <h3 className="text-lg font-semibold text-center mb-1">{movie.Title}</h3>
                    <p className="text-gray-500 text-sm mb-1">Рік: {movie.Year}</p>
                    <p className="text-gray-500 text-sm mb-1">IMDb: {movie.imdbRating || 'N/A'}</p>
                    <p className="text-gray-500 text-sm mb-1">Тривалість: {movie.Runtime || 'N/A'}</p>
                    <p className="text-gray-500 text-sm">Жанр: {movie.Genre || 'N/A'}</p>
                  </div>

                  {/* Опис фільму для десктопних пристроїв - виїжджає на банер */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-white bg-opacity-90 rounded-b-lg
                                  text-gray-800 transition-all duration-300 ease-in-out
                                  hidden min-[930px]:block
                                  min-[930px]:opacity-0 min-[930px]:group-hover:opacity-100
                                  min-[930px]:transform min-[930px]:translate-y-full min-[930px]:group-hover:translate-y-0">
                    <h3 className="text-lg font-semibold text-center mb-1">{movie.Title}</h3>
                    <p className="text-gray-500 text-sm mb-1">Рік: {movie.Year}</p>
                    <p className="text-gray-500 text-sm mb-1">IMDb: {movie.imdbRating || 'N/A'}</p>
                    <p className="text-gray-500 text-sm mb-1">Тривалість: {movie.Runtime || 'N/A'}</p>
                    <p className="text-gray-500 text-sm">Жанр: {movie.Genre || 'N/A'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (!loading && !selectedMovie && displayedMovies.length === 0 && !showDetails) ? (
            <div className="text-center text-lg mt-10">Фільми не знайдено. Спробуйте інший запит.</div>
          ) : null}

          {totalPages > 1 && !showDetails && (
            <div className="flex justify-center mt-10 flex-wrap gap-2">
              {getPageNumbers().map((pageNum, index) => (
                <button
                  key={index}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-4 py-2 rounded border ${
                    page === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  } ${pageNum === '...' ? 'cursor-default opacity-50' : ''} focus:outline-none`}
                  disabled={pageNum === '...'}
                >
                  {pageNum}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Футер */}
      <footer className="w-full bg-gray-100 text-gray-600 text-center py-4 mt-10 shadow-inner">
        <p>&copy; {new Date().getFullYear()} Oleksandr Zhuikov. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
