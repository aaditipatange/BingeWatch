const express = require("express");
const { users } = require("../data");
const router = express.Router();
// const data = require('../data');
// const usersData = require('../data/users');
const data = require("../data");
const multer = require("multer");
const xss = require("xss");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const path = "uploads/";
    fs.mkdirSync(path, { recursive: true });
    cb(null, path);
  },
  filename: function (req, file, cb) {
    cb(null, new Date().toISOString() + file.originalname);
  },
});

const upload = multer({ storage: storage });
// const usersData = require('../data/users');
const moviesData = data.movies;
const reviewData = data.reviews;
const usersData = data.users;
const validation = require("../data/validation");

router.get("/all", async (req, res) => {
  try {
    const listMovies = await moviesData.getAllMovies();
    let rev = await usersData.getUser(req.session.user.username);
    res.render("movies/allMovies", {
      movieList: listMovies,
      title: "All Movies",
      user: rev,
      authenticated: req.session.user ? true : false,
      username: req.session.user.username,
    });
  } catch (e) {
    res.status(400).render("pages/error", {
      error: e,
      title: "Search Error",
      authenticated: req.session.user ? true : false,
    });
  }
});

router.get("/allMovies", async (req, res) => {
  try {
    const listMovies = await moviesData.getAllMovies();
    res.json(listMovies);
  } catch (e) {}
});

//CHANGE: xss added with error
router.post("/all/:value", async (req, res) => {
  try {
    let sortVal = xss(req.params.value);
    if (!sortVal || typeof sortVal !== "string") {
      throw "invalid value field";
    }
    const sorted = await moviesData.getSort(sortVal);
    res.json(sorted);
  } catch (e) {
    res.status(404).json({ error: e });
  }
});

router.get("/addMovie", async (req, res) => {
  if (req.session.user) {
    try {
      res.render("movies/newMovie", {
        title: "Add Movies",
        authenticated: req.session.user ? true : false,
        username: req.session.user.username,
        new: true,
      });
    } catch (e) {
      res.status(400).render("pages/error", {
        error: e,
        title: "Search Error",
        authenticated: req.session.user ? true : false,
        username: req.session.user.username,
      });
    }
  } else {
    res.redirect("/");
  }
});

//CHANGE: error check with id and throw error string
router.get("/:id", async (req, res) => {
  //console.log(req.params.id);
  //console.log(req.session);
  if (req.session.user) {
    try {
      if (!req.params.id || typeof req.params.id !== "string")
        throw "invalid id passed";

      const movie = await moviesData.getMovie(req.params.id);

      const reviews = await reviewData.getReviewsByMovieId(req.params.id);
      //console.log(movie);
      //       res.render('movies/individualMovie',{movie:movie, reviews:reviews, user:req.session.user, title:'Characters Found'});
      //     } catch (e) {
      //       res.status(400).render('pages/error',{error:e, title:'Search Error'});
      //     }
      //   });
      let rev = await usersData.getUser(req.session.user.username);
      let view = "";
      if (
        movie.watched_list &&
        movie.watched_list.includes(req.session.user.username)
      ) {
        view = "disabled";
      }
      if (
        movie.favourite_list &&
        movie.favourite_list.includes(req.session.user.username)
      ) {
        fav = "UnFavorite";
      } else {
        fav = "Favorite";
      }
      if (
        movie.toWatch_list &&
        movie.toWatch_list.includes(req.session.user.username)
      ) {
        watch = "Watched";
      } else {
        watch = "Want to Watch";
      }
      if (reviews.length > 0) {
        for (let i = 0; i < reviews.length; i++) {
          if (reviews[i].reported.includes(req.session.user.username)) {
            reviews.splice(i, 1);
            i--;
          }
        }
      }

      res.render("movies/individualMovie", {
        movie: movie,
        view: view,
        watch: watch,
        fav: fav,
        title: movie.movie_name,
        reviews: reviews,
        user: rev,
        authenticated: req.session.user ? true : false,
        username: req.session.user.username,
      });
    } catch (e) {
      res.status(400).render("pages/error", {
        error: e,
        title: "Search Error",
        authenticated: req.session.user ? true : false,
        username: req.session.user.username,
      });
    }
  } else {
    res.status(403).render("pages/error", {
      authenticated: req.session.user ? true : false,
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const listMovies = await moviesData.getTrending();
    res.status(200).render("movies/allMovies", {
      movieList: listMovies,
      title: "Trending Movies",
      authenticated: req.session.user ? true : false,
      username: req.session.user.username,
    });
  } catch (e) {
    res.status(400).render("pages/error", {
      error: e,
      title: "Search Error",
      authenticated: req.session.user ? true : false,
    });
  }
});

// //TESTS ALPHABETICAL SORT
// router.get('/alpha', async (req, res) => {
//   try {
//     const listRest = await moviesData.sortAlphabetically();
//     res.status(200).json(listRest);
//   } catch (e) {
//     res.status(500).send();
//   }
// });

// //TESTS GENRE FILTER
// router.get('/genre', async (req, res) => {
//   try {
//     const listRest = await moviesData.getByGenre("comedy");
//     res.status(200).json(listRest);
//   } catch (e) {
//     res.status(500).send();
//   }
// });

//CHANGE: added xss in create try/catch
router.post("/addMovie", upload.single("movie_img"), async (req, res) => {
  let username =
    req.session.user != undefined || req.session.user != null
      ? req.session.user.username
      : "temp";
  const moviesDataList = req.body;
  if (req && req.file && req.file.fieldname === "movie_img" && moviesDataList) {
    moviesDataList.movie_img = "/" + req.file.path;
  } else {
    moviesDataList.movie_img = "public/images/logo.jpeg";
  }
  if (
    moviesDataList &&
    moviesDataList.stream_service &&
    moviesDataList.stream_service_url
  ) {
    moviesDataList.streaming_services = {
      name: xss(moviesDataList.stream_service),
      link: xss(moviesDataList.stream_service_url),
    };
  }
  if (!moviesDataList.movie_name) {
    res.status(400).json({ error: "You must provide Name of the Movie" });
    return;
  }
  if (!moviesDataList.director) {
    res
      .status(400)
      .json({ error: "You must provide the director name of the Movie" });
    return;
  }
  if (!moviesDataList.release_year) {
    res
      .status(400)
      .json({ error: "You must provide release year of the Movie" });
    return;
  }
  if (!moviesDataList.cast) {
    res.status(400).json({ error: "You must provide cast of the Movie" });
    return;
  }
  if (!moviesDataList.genre) {
    res.status(400).json({ error: "You must provide genre of the Movie" });
    return;
  }
  if (!moviesDataList.streaming_services) {
    res
      .status(400)
      .json({ error: "You must provide streaming services of the Movie" });
    return;
  }
  if (!moviesDataList.movie_img) {
    res
      .status(400)
      .json({ error: "You must provide poster/image of the Movie" });
    return;
  }
  if (moviesDataList && moviesDataList.cast) {
    moviesDataList.cast = moviesDataList.cast.split("\r\n");
  }
  if (moviesDataList && moviesDataList.genre) {
    moviesDataList.genre = moviesDataList.genre.split();
  }
  moviesDataList.release_year = parseInt(moviesDataList.release_year);
  try {
    let {
      movie_name,
      director,
      release_year,
      cast,
      streaming_services,
      genre,
      movie_img,
    } = moviesDataList;
    let newMovie = await moviesData.createMovie(
      xss(username),
      xss(movie_name),
      xss(director),
      parseInt(xss(release_year)),
      xss(cast).split("\r\n"),
      streaming_services,
      xss(genre),
      xss(movie_img)
    );
    // res.status(200).json(newMovie);
    // res.status(200).redirect('/movies/all')
    res.status(200).render("movies/newMovie", {
      added: "Movie Added Successfullly",
      new: false,
      authenticated: req.session.user ? true : false,
      username: req.session.user.username,
    });
  } catch (e) {
    res.status(500).json({ error: e });
  }
});

//CHANGE: error check for id and throw string
router.get("/edit/:id", async (req, res) => {
  if (req.session.user) {
    try {
      if (!req.params.id || typeof req.params.id !== "string")
        throw "invalid id passed";

      const movie = await moviesData.getMovie(req.params.id);
      let rev = await usersData.getUser(req.session.user.username);
      let cast = movie.cast;
      cast = cast.toString();
      movie.cast = cast;
      res.render("movies/updateMovie", {
        movie: movie,
        title: "Edit Movies",
      });
    } catch (e) {
      res
        .status(400)
        .render("pages/error", { error: e, title: "Update Error" });
    }
  } else {
    res.status(403).render("pages/error");
  }
});

//CHANGE: xss added
router.put("/edit/:id", async (req, res) => {
  if (!req.params.id || typeof req.params.id !== "string")
    throw "invalid id passed";

  const updatedData = req.body;
  if (
    !updatedData.movie_name ||
    !updatedData.director ||
    !updatedData.release_year ||
    !updatedData.cast ||
    !updatedData.genre ||
    !updatedData.streaming_services
  ) {
    res.status(400).json({ error: "You must Supply All fields" });
    return;
  }
  try {
    await moviesData.getMovie(req.params.id);
  } catch (e) {
    res.status(404).json({ error: "Movie/TV Show not found" });
    return;
  }

  try {
    const {
      movie_name,
      director,
      release_year,
      cast,
      streaming_services,
      genre,
      movie_img,
    } = updatedData;
    const updatedMovie = await moviesData.updatingMovie(
      req.params.id,
      xss(movie_name),
      xss(director),
      xss(release_year),
      xss(cast),
      xss(streaming_services),
      xss(genre),
      xss(movie_img)
    );
    res.status(200).json(updatedMovie);
  } catch (e) {
    res.status(500).json({ error: e });
  }
});

//CHANGE: xss added
router.post("/report", async function (req, res) {
  let data = req.body;
  const { movieId, username } = data;
  const reported = await moviesData.updateMovieReport(
    xss(movieId),
    xss(username)
  );
  res.json(reported);
});

//CHANGE: xss added
//ADDING MOVIE TO USER'S FAVE LIST
router.post("/favorite/:id", async (req, res) => {
  const movie = req.body;
  try {
    const { username, movie_name } = movie;
    //const movie = await moviesData.getMovie(req.params.id);
    let userFav = await usersData.addToFave(xss(username), xss(movie_name));
    res.status(200).json(userFav);
  } catch (e) {
    res.status(400).render("pages/error", { error: e, title: "Error" });
  }
});

//REMOVING MOVIE FROM USER'S FAVE LIST
// router.post("/unfavorite/:id", async (req, res) => {
//   const movie = req.body;
//   try {
//     const{username,movie_name} = movie;
//     //const movie = await moviesData.getMovie(req.params.id);
//     const user = await usersData.removeFromFave(username,movie_name);
//     res.status(200).json(user);
//   } catch (e) {
//     res.status(400).render("pages/error", { error: e, title: "Search Error" });
//   }
// });

//CHANGE: xss added
//ADDING MOVIE TO USER'S WATCHLIST
router.post("/watchlist/:id", async (req, res) => {
  const movie = req.body;
  try {
    const { username, movie_name } = movie;
    //const movie = await moviesData.getMovie(req.params.id);
    let userWatch = await usersData.addToWatch(xss(username), xss(movie_name));
    res.status(200).json(userWatch);
  } catch (e) {
    res.status(400).render("pages/error", { error: e, title: "Error" });
  }
});

//REMOVING MOVIE FROM USER'S WATCHLIST
// router.get("/unwatchlist/:id", async (req, res) => {
//   try {
//     const movie = await moviesData.getMovie(req.params.id);
//     const user = await usersData.removeFromWatch("royroy", movie["movie_name"]);
//     res.status(200).json(user);
//   } catch (e) {
//     res.status(400).render("pages/error", { error: e, title: "Search Error" });
//   }
// });

//CHANGE: xss added
//MARKING MOVIE AS WATCHED
router.post("/watched/:id", async (req, res) => {
  const movie = req.body;
  try {
    const { username, movie_name } = movie;
    //const movie = await moviesData.getMovie(req.params.id);
    const watchMovie = await moviesData.movieWatched(
      xss(username),
      xss(movie_name)
    );
    res.status(200).json(watchMovie);
  } catch (e) {
    res.status(400).render("pages/error", {
      error: e,
      title: "Search Error",
      authenticated: req.session.user ? true : false,
      username: req.session.username,
    });
  }
});

//CHANGE: input check for term and throw string
//SEARCH BAR WHEN GIVEN MOVIE NAME
router.get("/search/movie/:term", async (req, res) => {
  try {
    if (!req.params.term || typeof req.params.term !== "string")
      throw "invalid term passed";

    const movie = await moviesData.searchByMovie(req.params.term);
    res.render("movies/allMovies", {
      movieList: movie,
      title: "All Movies",
      user: req.session.user.username,
      authenticated: req.session.user ? true : false,
      username: req.session.user.username,
    });
  } catch (e) {
    res.status(400).render("pages/error", {
      error: e,
      title: "Search Error",
      authenticated: req.session.user ? true : false,
      username: req.session.username,
    });
  }
});

//CHANGE: input check for term and throw string
//SEARCH BAR WHEN GIVEN DIRECTOR
router.get("/search/director/:term", async (req, res) => {
  try {
    if (!req.params.term || typeof req.params.term !== "string")
      throw "invalid term passed";

    const movie = await moviesData.searchByDirector(req.params.term);
    res.render("movies/allMovies", {
      movieList: movie,
      title: "All Movies",
      user: req.session.user.username,
      authenticated: req.session.user ? true : false,
      username: req.session.user.username,
    });
  } catch (e) {
    res.status(400).render("pages/error", {
      error: e,
      title: "Search Error",
      authenticated: req.session.user ? true : false,
      username: req.session.username,
    });
  }
});

//CHANGE: input check for term and routes
//SEARCH BAR WHEN GIVEN CAST NAME
router.get("/search/cast/:term", async (req, res) => {
  try {
    if (!req.params.term || typeof req.params.term !== "string")
      throw "invalid term passed";

    const movie = await moviesData.searchByCast(req.params.term);
    res.render("movies/allMovies", {
      movieList: movie,
      title: "All Movies",
      user: req.session.user.username,
      authenticated: req.session.user ? true : false,
      username: req.session.user.username,
    });
  } catch (e) {
    res.status(400).render("pages/error", {
      error: e,
      title: "Search Error",
      authenticated: req.session.user ? true : false,
      username: req.session.username,
    });
  }
});

// router.post('/addMovie', async (req, res) => {
//     const moviesDataList = req.body;
//     if (!moviesDataList.movie_name) {
//       res.status(400).json({ error: 'You must provide Name of the Movie' });
//       return;
//     }
//     if (!moviesDataList.director) {
//       res.status(400).json({ error: 'You must provide the director name of the Movie' });
//       return;
//     }
//     if (!moviesDataList.release_year) {
//       res.status(400).json({ error: 'You must provide release year of the Movie' });
//       return;
//     }
//     if (!moviesDataList.cast) {
//       res.status(400).json({ error: 'You must provide cast of the Movie' });
//       return;
//     }
//     if (!moviesDataList.genre) {
//       res.status(400).json({ error: 'You must provide genre of the Movie' });
//       return;
//     }
//     if (!moviesDataList.streaming_services) {
//       res.status(400).json({ error: 'You must provide streaming services of the Movie' });
//       return;
//     }
//     if (!moviesDataList.movie_img) {
//       res.status(400).json({ error: 'You must provide poster/image of the Movie' });
//       return;
//     }

//     try {
//       const { movie_name, director, release_year, cast, streaming_services, genre, movie_img } = moviesDataList;
//       const newMovie = await moviesData.createMovie(movie_name, director, release_year, cast, streaming_services,genre, movie_img);
//       res.status(200).json(newMovie);
//     } catch (e) {
//       res.status(500).json({ error: e });
//     }
//   });

// router.put("/edit/:id", async (req, res) => {
//   const updatedData = req.body;
//   if (
//     !updatedData.movie_name ||
//     !updatedData.director ||
//     !updatedData.release_year ||
//     !updatedData.cast ||
//     !updatedData.genre ||
//     !updatedData.streaming_services
//   ) {
//     res.status(400).json({ error: "You must Supply All fields" });
//     return;
//   }
//   try {
//     await moviesData.getMovie(req.params.id);
//   } catch (e) {
//     res.status(404).json({ error: "Movie/TV Show not found" });
//     return;
//   }

//   try {
//     const {
//       movie_name,
//       director,
//       release_year,
//       cast,
//       streaming_services,
//       genre,
//       movie_img,
//     } = updatedData;
//     const updatedMovie = await moviesData.updatingMovie(
//       req.params.id,
//       movie_name,
//       director,
//       release_year,
//       cast,
//       streaming_services,
//       genre,
//       movie_img
//     );
//     res.status(200).json(updatedMovie);
//   } catch (e) {
//     res.status(500).json({ error: e });
//   }
// });

// router.delete('/:id', async (req, res) => {
//     if (!req.params.id) {
//       res.status(400).json({ error: 'You must Supply an ID to delete' });
//       return;
//     }
//     try {
//       await moviesData.get(req.params.id);
//     } catch (e) {
//       res.status(404).json({ error: 'Movie not found' });
//       return;
//     }
//     try {
//       const delmovie = await moviesData.remove(req.params.id);
//       res.status(200).json(delmovie);
//     } catch (e) {
//       res.status(500).json({ error: e });
//     }
//   });

module.exports = router;
