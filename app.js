const express = require('express');
const session = require('express-session');
const app = express();

const static = express.static(__dirname + '/public');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const configRoutes = require('./routes');
const exphbs = require('express-handlebars');
const Handlebars = require('handlebars');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.engine('handlebars', exphbs({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');

const { client } = require('./config/mongoConnection');
const users = require('./data/users');
const closeConnection = require('./config/mongoConnection');

const { getAllUsers } = require('./data/users');
app.use('/public', static);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
	session({
		name: 'AuthCookie',
		secret: 'some secret string!',
		resave: false,
		saveUninitialized: true,
	})
);

Handlebars.registerHelper('if_eq', function(a, b, opts) {
    if (a == b) {
        return opts.fn(this);
    } else {
        return opts.inverse(this);
    }
});

// //NEED TO COMMENT THIS OUT LATER : JUST FOR UNDERSTANDING ROUTES
// app.use((req, res, next) => {
// 	if (!req.session.user) {
// 		console.log(
// 			new Date().toUTCString(),
// 			req.method,
// 			req.originalUrl,
// 			'(Non-Authenticated User)'
// 		);
// 	} else {
// 		console.log(
// 			new Date().toUTCString(),
// 			req.method,
// 			req.originalUrl,
// 			'(Authenticated User)'
// 		);
// 	}
// 	next();
// });
// ---------------------------------------------------

//if user tries to access private route without being authenicated
app.use('/private', (req, res, next) => {
	//console.log(req.session.id);
	if (!req.session.user) {
		return res.status(403).redirect('/noSession');
	} else {
		next();
	}
});

app.use('/movies/addMovie', (req, res, next) => {
	//console.log(req.session.id);
	if (!req.session.user) {
		return res.status(403).render('pages/error');
	} else {
		next();
	}
});

// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

//if user tries to access private route without being authenicated
app.use('/private', (req, res, next) => {
	//console.log(req.session.id);
	if (!req.session.user) {
		return res.status(403).redirect('/noSession');
	} else {
		next();
	}
});

app.use('/uploads', express.static('uploads'));
app.use('/profile', express.static('profile'));

// app.engine('handlebars', exphbs({ defaultLayout: 'main' }));
// app.set('view engine', 'handlebars');

configRoutes(app);

app.listen(3000, () => {
	console.log("We've now got a server!");
	console.log('Your routes will be running on http://localhost:3000');
});
