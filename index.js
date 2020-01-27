// Libraries used
const express = require('express');
const querystring = require('querystring');
const https = require('https');
const fs = require('fs');


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

// sets up static access for public gif folder to server up gif files
app.use('/gif', express.static('gif'));

app.get('/', (req, res) => {
    res.render('index');
});
// set up static serving get function

app.get('/search', (req, res) => {
    let zipcode = req.query.zip;
    let openWeatherQuery = querystring.stringify({zip:zipcode, appid:CREDENTIALS["openWeather"].apikey})
    console.log(req.query.zip)

    // ensures gif folder exists
    try {
        fs.statSync('./gif');
      } catch(e) {
        fs.mkdirSync('./gif');
      }

    // pass zipcode, temperature, 
    const generateWebpage = (dataItems) => {
        let mainTitle = `The Current Weather in ${dataItems.zipcode} is ${dataItems.temp}`
        let description = `The maximum temperature is ${dataItems.tempMax}, the minimum temperature is ${dataItems.tempMin}.
                           Currently outside it is: ${dataItems.tempDesc}.
                          `


        res.render('search', {title: mainTitle, description: description, localURL: dataItems.localURL, gifDescription: dataItems.gifTitle, gifURL: dataItems.gifURL});
    }

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
                let giphyQuery = querystring.stringify({api_key:CREDENTIALS["giphy"].apikey ,q:desc, offset:giphyResultOffset});

                let giphyRequest = https.request(GIPHY.concat(giphyQuery), (res) => {
                    let giphyBody = '';
                    res.on('data', (chunk) => {
                        giphyBody += chunk;
                    })
                    res.on('end', () => {
                        let giphyJSON = JSON.parse(giphyBody);
                        let gifItemNumber = Math.floor(Math.random() * 20);
                        let gifID = giphyJSON.data[gifItemNumber].id;
                        let gifURL = giphyJSON.data[gifItemNumber].images.downsized.url;
                        let gifTitle = giphyJSON.data[gifItemNumber].title;
                        
                        let localGifURL = './gif/'.concat(gifID, '.gif');

                        fs.access(localGifURL, fs.F_OK, (err) => {
                            if(err){
                                let gifRequest = https.get(gifURL, function(res){
                                    let gifItem = fs.createWriteStream(localGifURL, {'encoding': null});
                                    res.pipe(gifItem);

                                    console.log(`GIf url is ${gifURL}`)

                                    gifItem.on('finish', () => {
                                        // generate web page
                                        generateWebpage({zipcode: zipcode, temp: temp, tempMax: formatedTempMax, tempMin: formatedTempMin,tempDesc: desc, localURL: localGifURL, gifURL: gifURL, gifTitle: gifTitle})
                                    })
                                })

                                gifRequest.on('error', (err) => {
                                    console.log(err);

                                })

                                gifRequest.end();
                            }
                            else{
                                // generate webpage right away
                                generateWebpage({zipcode: zipcode, temp: temp, tempMax: formatedTempMax, tempMin: formatedTempMin,tempDesc: desc, localURL: localGifURL, gifURL: gifURL, gifTitle: gifTitle})
                            }
                        })
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
});



app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
})