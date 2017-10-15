/* global Promise */
const express = require('express');
const bodyParser = require('body-parser')
const jsonParser = bodyParser.json()
const cors = require('cors');
const io = require('socket.io')(8080);
const Twit = require('twit');

const twitterConfig = require('./config');

const app = express();

var twitter = new Twit({
  consumer_key:         twitterConfig.twitter.consumerKey,
  consumer_secret:      twitterConfig.twitter.consumerSecret,
  access_token:         twitterConfig.twitter.accessToken,
  access_token_secret:  twitterConfig.twitter.accessTokenSecret,
  timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
})

const streams = {};
const MAX = 4;

const tweetTrack = (req, res, next) => {
  const { word } = req.body;

  if (!word || streams[word] || Object.keys(streams).length >= MAX) {
    res.status(400).send({});
    return next();
  }

  streams[word] = twitter.stream('statuses/filter', { track: word });
  streams[word].on('tweet', (tweet) => {
    io.emit(word, tweet);
  });

  res.status(200).send({});
  return next();
}

const tweetUntrack = (req, res, next) => {
  const { word } = req.body;
  if (!word || !streams[word]) {
    res.status(400).send({});
    return next();
  }

  streams[word].stop();
  delete streams[word];

  res.status(200).send({});
  return next();
}

io.on('connection', (sock) => {
  sock.on('disconnect', () => Object.keys(streams).forEach(key => {
    streams[key].stop();
    delete streams[key];
  }));
})

app.use(cors());
app.use(bodyParser.json());

app.post('/track', tweetTrack);
app.post('/untrack', tweetUntrack);

app.listen(3000);

