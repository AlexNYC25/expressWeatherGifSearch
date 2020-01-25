// Libraries used
const express = require('express');
const querystring = require('querystring');
const https = require('https');


const app = express();
const port = 3000;

// api endpoints
const OPENWEATHER = 'https://api.openweathermap.org/data/2.5/weather?';
const GIPHY = 'https://api.giphy.com/v1/gifs/search?';

// api credentials
const CREDENTIALS = require('./auth/credentials.json');

// express app settings
app.set('view engine', 'pug');
app.set('views', './views');

app.get('/', (req, res) => {
    res.render('index');
});
app.get('/search', (req, res) => {
    let zipcode = req.query.zip;
    let openWeatherQuery = querystring.stringify({zip:zipcode, appid:CREDENTIALS["openWeather"].apikey})
    console.log(req.query.zip)

    let openWeatherResult = https.request(OPENWEATHER.concat(openWeatherQuery), (res) => {
        let weatherBody = '';
        res.on('data', (chunk) => {
            weatherBody += chunk;
        })

        // once json result download has completed;
        res.on('end', () => {
            let weatherJSON = JSON.parse(weatherBody);
            
            if(weatherJSON.cod != 200){
                // generate error page if json status code is not 200
            }
            else{
                let desc = weatherJSON.weather[0].main;
                let temp = Math.round((weatherJSON.main.temp * (9/5)) - 459.67);
                let formatedTempMax = Math.round((weatherJSON.main.temp_max * (9/5)) - 459.67);
                let formatedTempMin = Math.round((weatherJSON.main.temp_min * (9/5)) - 459.67);
                console.log(desc);

                let giphyResultOffset = Math.floor(Math.random() * 25);
                let giphyQuery = querystring.stringify({api_key:credentials["giphy"].apikey ,q:desc, offset:giphyResultOffset});

                let giphyRequest = https.request(GIPHY.concat(giphyQuery), (res) => {
                    let giphyBody = '';
                    res.on('data', (chunk) => {
                        giphyBody += chunk;
                    })
                    res.on('end', () => {
                        let giphyJSON = JSON.parse(giphyBody);
                        let gifItemNumber = Math.floor(Math.random() * 20);
                    })
                })
                
                giphyRequest.on('error', (e) => {
                    console.log(e);
                })

                giphyRequest.end();
            }
        })
    })

    openWeatherResult.on('error', (e) => {
        console.log(e);
    })

    openWeatherResult.end();
})


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
})