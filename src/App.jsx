import { useState, useEffect, useRef } from 'react';

const API_KEY = "9cc72804"; // Returned to old OMDB API Key
const RESULTS_PER_PAGE = 8; // Changed to 8 movies per page

function App() {
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState([]);
  const [displayedMovies, setDisplayedMovies] = useState([]); // State for sorted movies
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null); // State for selected movie (details)
  const [showDetails, setShowDetails] = useState(false); // State for showing detailed description
  const [showSortOptions, setShowSortOptions] = useState(false); // State for displaying sorting options
  const [sortOption, setSortOption] = useState('none'); // 'none', 'year', 'genre', 'imdbRating'
  const [cardRotations, setCardRotations] = useState({}); // State for storing the current rotation of each card
  const [initialCardRotations, setInitialCardRotations] = useState({}); // State for storing the initial rotation of each card
  const [isMobile, setIsMobile] = useState(false); // State for determining mobile device
  const [currentPage, setCurrentPage] = useState('home'); // 'home' or 'about'

  const detailsRef = useRef(null); // Create ref for detailed description

  // Effect to determine mobile device
  useEffect(() => {
    const checkIsMobile = () => {
      // Consider mobile if screen width is less than 930px (breakpoint for burger menu)
      setIsMobile(window.innerWidth < 930);
    };

    checkIsMobile(); // Initial check on component load
    window.addEventListener('resize', checkIsMobile); // Add resize event listener
    return () => window.removeEventListener('resize', checkIsMobile); // Clean up listener on component unmount
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
          return movie; // Return original movie if detail fetching failed
        });

        const fullyEnrichedMovies = await Promise.all(enrichedMoviesPromises);
        setMovies(fullyEnrichedMovies);
        setTotalResults(Number(data.totalResults)); // Still based on initial search

        // Initialize random rotations for new cards
        const newInitialRotations = {};
        fullyEnrichedMovies.forEach(movie => {
          newInitialRotations[movie.imdbID] = getRandomRotation();
        });
        setInitialCardRotations(newInitialRotations);
        setCardRotations(newInitialRotations); // Set initial rotations also for display

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
        // showDetails is now set in handleMovieClick after loading is complete
        return data; // Return data for use in handleMovieClick
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
      setLoading(false); // Loading complete
    }
  };

  const handleMovieClick = async (movie) => { // Made async
    const details = await fetchMovieDetails(movie.imdbID); // Wait for details to load
    if (details) {
      setShowDetails(true); // Now start animation after loading
      setTimeout(() => {
          if (detailsRef.current) {
              detailsRef.current.scrollTop = 0; // Scroll modal content to top
          }
      }, 100);
    }
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setTimeout(() => setSelectedMovie(null), 700);
  };

  // Function to apply sorting
  const applySorting = (moviesToSort, currentSortOption) => {
    if (currentSortOption === 'none') {
      return moviesToSort;
    }

    const sorted = [...moviesToSort].sort((a, b) => {
      if (currentSortOption === 'year') {
        const yearA = parseInt(a.Year) || 0;
        const yearB = parseInt(b.Year) || 0;
        return yearB - yearA; // By year (descending, newest first)
      } else if (currentSortOption === 'genre') {
        const genreA = a.Genre || '';
        const genreB = b.Genre || '';
        return genreA.localeCompare(genreB); // By genre (alphabetical order)
      } else if (currentSortOption === 'imdbRating') {
        const ratingA = parseFloat(a.imdbRating) || 0; // Handle 'N/A' or missing values
        const ratingB = parseFloat(b.imdbRating) || 0;
        return ratingB - ratingA; // By popularity (highest rating first)
      }
      return 0; // No sorting
    });
    return sorted;
  };

  useEffect(() => {
    searchMovies('movie', '', 1);
  }, []);

  // Effect to apply sorting when movies or sort option changes
  useEffect(() => {
    setDisplayedMovies(applySorting(movies, sortOption));
  }, [movies, sortOption]);

  // Limit total pages to 100 results from OMDB API
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

  // Heights for dynamic padding-top
  const navHeight = 72; // Approximate navigation height
  const sortOptionsBlockHeight = 48; // Approximate height of sort block when visible (can adjust this value)
  const dynamicPaddingTop = showSortOptions ? navHeight + sortOptionsBlockHeight : navHeight;

  const handleSort = (type) => {
    setSortOption(type);
    setShowSortOptions(false); // Close sorting options after selection
  };

  // Function to generate random tilt (range increased for better visibility)
  const getRandomRotation = () => {
    const randomDegree = Math.floor(Math.random() * 31) - 15; // From -15 to 15 degrees
    return `rotate(${randomDegree}deg)`;
  };

  // Hover event handlers for cards
  const handleMouseEnter = (imdbID) => {
    // Apply 0deg rotation only if not a mobile device
    if (!isMobile) {
      setCardRotations(prevRotations => ({
        ...prevRotations,
        [imdbID]: 'rotate(0deg)'
      }));
    }
  };

  const handleMouseLeave = (imdbID) => {
    // Restore initial rotation only if not a mobile device
    if (!isMobile) {
      setCardRotations(prevRotations => ({
        ...prevRotations,
        [imdbID]: initialCardRotations[imdbID]
      }));
    }
  };

  const handleGoHome = () => {
    setCurrentPage('home');
    setQuery('');
    setPage(1);
    searchMovies('movie', '', 1);
    setIsMenuOpen(false);
    setShowDetails(false); // Ensure details are closed when going home
  };

  const handleShowAbout = () => {
    setCurrentPage('about');
    setIsMenuOpen(false);
    setShowDetails(false); // Ensure details are closed when going to about page
  };

  return (
    <div className="min-h-screen w-screen bg-white text-gray-800 font-sans flex flex-col items-center overflow-x-hidden select-none">
      <nav className={`bg-white border-gray-200 w-full fixed top-0 left-0 right-0 z-40 ${showSortOptions ? '' : 'shadow-md'}`}> {/* Fixed navigation, shadow only when sorting is not shown */}
        <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4 gap-4">
          <a onClick={handleGoHome} className="flex items-center space-x-3 rtl:space-x-reverse cursor-pointer">
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
                    setCurrentPage('home');
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
                    placeholder="Search..."
                    required
                  />
                </form>
              </li>
              <li>
                <a onClick={handleGoHome}
                   className={`block py-2 px-3 min-[930px]:p-0 focus:outline-none cursor-pointer
                   ${currentPage === 'home' ? 'text-blue-700' : 'text-gray-900 hover:text-blue-700'}`}>
                  Home
                </a>
              </li>
              <li>
                <a onClick={handleShowAbout}
                   className={`block py-2 px-3 min-[930px]:p-0 focus:outline-none cursor-pointer
                   ${currentPage === 'about' ? 'text-blue-700' : 'text-gray-900 hover:text-blue-700'}`}>
                  About Us
                </a>
              </li>
              <li>
                <button
                  onClick={() => {
                    setShowSortOptions(!showSortOptions);
                    setIsMenuOpen(false);
                  }}
                  className={`block py-2 px-3 min-[930px]:p-0 bg-transparent border-0 focus:outline-none
                  ${showSortOptions ? 'text-blue-700' : 'text-gray-900 hover:text-blue-700'}`}
                >
                  Sort
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
              setCurrentPage('home');
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
              placeholder="Search..."
              required
            />
          </form>
        </div>
      </nav>

      {/* Sort options block */}
      <div className={`
        fixed left-0 right-0 bg-white z-30 overflow-hidden
        ${showSortOptions ? 'max-h-40 opacity-100 py-2 shadow-md transition-all duration-300 ease-in-out' : 'max-h-0 opacity-0 pointer-events-none'}
      `} style={{ top: `${navHeight - 2}px` }}>
        <div className="max-w-screen-xl mx-auto flex flex-col items-start min-[930px]:flex-row min-[930px]:justify-center min-[930px]:space-x-8 px-4">
          <button
            onClick={() => handleSort('year')}
            className="block px-4 py-2 text-gray-900 hover:text-blue-700 w-full text-left min-[930px]:w-auto min-[930px]:text-center rounded-lg bg-transparent border-0 focus:outline-none"
          >
            By Year (Newest)
          </button>
          <button
            onClick={() => handleSort('genre')}
            className="block px-4 py-2 text-gray-900 hover:text-blue-700 w-full text-left min-[930px]:w-auto min-[930px]:text-center rounded-lg bg-transparent border-0 focus:outline-none"
          >
            By Genre (A-Z)
          </button>
          <button
            onClick={() => handleSort('imdbRating')}
            className="block px-4 py-2 text-gray-900 hover:text-blue-700 w-full text-left min-[930px]:w-auto min-[930px]:text-center rounded-lg bg-transparent border-0 focus:outline-none"
          >
            By Popularity (IMDb)
          </button>
        </div>
      </div>

      {/* Main content, grows to attach footer */}
      <div className="w-full px-4 flex-grow transition-all duration-300 ease-in-out" style={{ paddingTop: `${dynamicPaddingTop}px` }}>
        <div className="max-w-screen-xl mx-auto w-full">
          {currentPage === 'home' ? (
            <>
              {loading ? (
                <div className="flex justify-center items-center h-48">
                  <div className="w-16 h-16 rounded-full bg-blue-600 animate-pulse"></div>
                </div>
              ) : null}

              {/* Movie details - now appears centered on the page as a modal */}
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
                        Close
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
                            src="https://placehold.co/200x300/2563EB/FFFFFF?text=Poster+Unavailable"
                            alt="Poster Unavailable"
                            className="w-48 h-auto object-cover rounded-lg shadow-lg min-[930px]:w-64"
                          />
                        )}
                      </div>
                      <div className="flex-grow">
                        <h2 className="text-3xl font-bold mb-2 text-gray-900">{selectedMovie.Title} ({selectedMovie.Year})</h2>
                        <p className="text-gray-700 text-lg mb-2">
                          <span className="font-semibold">IMDb Rating:</span> {selectedMovie.imdbRating || 'N/A'}
                        </p>
                        <p className="text-gray-700 text-lg mb-2">
                          <span className="font-semibold">Genre:</span> {selectedMovie.Genre || 'N/A'}
                        </p>
                        <p className="text-gray-700 text-lg mb-2">
                          <span className="font-semibold">Runtime:</span> {selectedMovie.Runtime || 'N/A'}
                        </p>
                        <p className="text-gray-700 text-lg mb-2">
                          <span className="font-semibold">Director:</span> {selectedMovie.Director || 'N/A'}
                        </p>
                        <p className="text-gray-700 text-lg mb-2">
                          <span className="font-semibold">Writer:</span> {selectedMovie.Writer || 'N/A'}
                        </p>
                        <p className="text-gray-700 text-lg mb-2">
                          <span className="font-semibold">Actors:</span> {selectedMovie.Actors || 'N/A'}
                        </p>
                        <p className="text-gray-700 text-lg mb-4">
                          <span className="font-semibold">Plot:</span> {selectedMovie.Plot || 'N/A'}
                        </p>
                        <p className="text-gray-700 text-lg mb-2">
                          <span className="font-semibold">Awards:</span> {selectedMovie.Awards || 'N/A'}
                        </p>
                        <p className="text-gray-700 text-lg mb-2">
                          <span className="font-semibold">Language:</span> {selectedMovie.Language || 'N/A'}
                        </p>
                        <p className="text-gray-700 text-lg mb-2">
                          <span className="font-semibold">Country:</span> {selectedMovie.Country || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Movie grid - hidden when details are displayed */}
              {!loading && displayedMovies.length > 0 && !showDetails ? (
                <div className="grid w-full grid-cols-1 sm:grid-cols-2 min-[930px]:grid-cols-3 lg:grid-cols-4 gap-6 relative justify-items-center items-start">
                  {displayedMovies.map((movie) => (
                    <div
                      key={movie.imdbID}
                      className="group relative bg-white rounded-lg shadow-md cursor-pointer flex flex-col overflow-hidden
                                 transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl hover:z-10"
                      // Apply rotation only if not a mobile device
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
                          src="https://placehold.co/200x300/2563EB/FFFFFF?text=Poster+Unavailable"
                          alt="Poster Unavailable"
                          className="w-full aspect-[2/3] object-cover rounded-t-lg"
                        />
                      )}
                      {/* Movie description for mobile devices - located under the image */}
                      <div className="p-4 bg-white rounded-b-lg text-gray-800 min-[930px]:hidden">
                        <h3 className="text-lg font-semibold text-center mb-1">{movie.Title}</h3>
                        <p className="text-gray-500 text-sm mb-1">Year: {movie.Year}</p>
                        <p className="text-gray-500 text-sm mb-1">IMDb: {movie.imdbRating || 'N/A'}</p>
                        <p className="text-gray-500 text-sm mb-1">Runtime: {movie.Runtime || 'N/A'}</p>
                        <p className="text-gray-500 text-sm">Genre: {movie.Genre || 'N/A'}</p>
                      </div>

                      {/* Movie description for desktop devices - slides over the banner */}
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white bg-opacity-90 rounded-b-lg
                                      text-gray-800 transition-all duration-300 ease-in-out
                                      hidden min-[930px]:block
                                      min-[930px]:opacity-0 min-[930px]:group-hover:opacity-100
                                      min-[930px]:transform min-[930px]:translate-y-full min-[930px]:group-hover:translate-y-0">
                        <h3 className="text-lg font-semibold text-center mb-1">{movie.Title}</h3>
                        <p className="text-gray-500 text-sm mb-1">Year: {movie.Year}</p>
                        <p className="text-gray-500 text-sm mb-1">IMDb: {movie.imdbRating || 'N/A'}</p>
                        <p className="text-gray-500 text-sm mb-1">Runtime: {movie.Runtime || 'N/A'}</p>
                        <p className="text-gray-500 text-sm mb-1">Genre: {movie.Genre || 'N/A'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (!loading && !selectedMovie && displayedMovies.length === 0 && !showDetails && currentPage === 'home') ? (
                <div className="text-center text-lg mt-10">No movies found. Try a different query.</div>
              ) : null}

              {totalPages > 1 && !showDetails && currentPage === 'home' && (
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
            </>
          ) : (
            <div className="max-w-screen-md mx-auto bg-white rounded-lg shadow-md p-6 mt-10 text-gray-800">
              <h2 className="text-3xl font-bold mb-4 text-center">About This Project</h2>
              <p className="text-lg mb-4 text-gray-700 leading-relaxed">
                Welcome to <span className="font-bold">MovieApp</span>, a dynamic web application built to showcase modern front-end development skills.
                This project allows users to effortlessly search for a wide array of movies, view detailed information
                about each film, and explore various sorting options to find exactly what they're looking for.
                It's a testament to creating engaging and responsive user experiences.
              </p>
              <h3 className="text-2xl font-semibold mb-3 text-gray-800">Key Technologies Used:</h3>
              <div className="flex flex-wrap justify-center gap-6 mb-6">
                <div className="flex flex-col items-center">
                  <span className="text-5xl text-blue-500 mb-2">⚛️</span> {/* React Icon (Emoji) */}
                  <a href="https://react.dev/" target="_blank" rel="noopener noreferrer" className="text-md font-medium text-gray-700 hover:underline">React</a>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-5xl text-blue-400 mb-2">🎨</span> {/* Tailwind CSS Icon (Emoji) */}
                  <a href="https://tailwindcss.com/" target="_blank" rel="noopener noreferrer" className="text-md font-medium text-gray-700 hover:underline">Tailwind CSS</a>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-5xl text-red-500 mb-2">🎬</span> {/* API Icon (Emoji) */}
                  <a href="https://www.omdbapi.com/" target="_blank" rel="noopener noreferrer" className="text-md font-medium text-gray-700 hover:underline">OMDB API</a>
                </div>
              </div>
              <p className="text-lg mb-4 text-gray-700 leading-relaxed">
                <span className="font-bold">MovieApp</span> is meticulously crafted with <span className="font-bold">React</span> for a robust and interactive user interface, leveraging
                its component-based architecture for efficient development. <span className="font-bold">Tailwind CSS</span> provides a highly flexible
                and utility-first approach to styling, ensuring a fully responsive and aesthetically pleasing design
                across all devices. The movie data is powered by the comprehensive <span className="font-bold">OMDB API</span>, allowing for
                real-time access to a vast database of film information.
              </p>
              <p className="text-lg mb-4 text-gray-700 leading-relaxed">
                This project is developed as a <span className="font-bold">demonstration for my portfolio</span>, highlighting my capabilities in
                building performant and user-friendly web applications. It showcases my understanding of modern web
                standards, API consumption, state management, and adaptive design principles.
              </p>
              <p className="text-lg text-center mt-6">
                Connect with me on Upwork: <a href="https://www.upwork.com/freelancers/~015f5a8a7a922830f0" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold">My Upwork Profile</a>
              </p>
            </div>
          )}
        </div>
      </div>
      {/* Footer */}
      <footer className="w-full bg-gray-100 text-gray-600 text-center py-4 mt-10 shadow-inner">
        <p className="text-sm text-gray-600 mb-1">This is a demonstration project for portfolio purposes.</p>
        <p className="text-sm text-gray-600">&copy; {new Date().getFullYear()} Oleksandr Zhuikov.</p>
      </footer>
    </div>
  );
}

export default App;
