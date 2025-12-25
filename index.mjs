import express from 'express';
import 'dotenv/config';
import crypto from 'crypto';
import querystring from 'querystring';
import session from 'express-session';

const app = express();
const PORT = 3000;
const HOST = '127.0.0.1';

app.use(session({
  secret: 'dev-secret',
  resave: false,
  saveUninitialized: false
}));

app.set('view engine', 'ejs');

app.use(express.static('public'));
app.use(express.urlencoded({extended:true}));

//routes
app.get('/', (req, res) => {
   res.render('intro.ejs');
});

app.listen(PORT, HOST, ()=>{
    console.log("Express server running");
});

// Send user to grant access from Spotify
app.get('/login', async (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    const scope = 'streaming user-read-private user-read-email user-follow-read user-library-read user-read-recently-played';

    res.redirect(`${process.env.AUTH_URL}?` +
        querystring.stringify({
        'client_id': process.env.SPOTIFY_CLIENT_ID,
        'response_type': 'code',
        'scope': scope,
        'redirect_uri': process.env.SPOTIFY_REDIRECT_URI,
        'state': state,
        'show_dialog': true //DELETE POST DEV
    }));
});

app.get('/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) return res.redirect('/');

  const tokenResponse = await fetch(process.env.TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization':
        'Basic ' +
        Buffer.from(
          process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET
        ).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI
    })
  });

  const tokenData = await tokenResponse.json();

  req.session.accessToken = tokenData.access_token;
  req.session.refreshToken = tokenData.refresh_token;
  req.session.expiresAt = Date.now() + tokenData.expires_in * 1000;

  res.redirect('/home');
});


app.get('/home', (req, res) => {
   res.render('home.ejs');
});