// Libraries used
const express = require('express');
const querystring = require('querystring');
const https = require('https');
const fs = require('fs');
// initial express app
const app = express();
// port number
const port = 3000;

// api endpoints
const OPENWEATHER = 'https://api.openweathermap.org/data/2.5/weather?';
const GIPHY = 'https://api.giphy.com/v1/gifs/search?';

// api credentials
const CREDENTIALS = require('./auth/credentials.json');

// express app settings
app.set('view engine', 'pug');
app.set('views', './views');

// sets up static access for public gif folder to serve up gif files
app.use('/gif', express.static('gif'));
// sets up access to css files
app.use('/css', express.static('css'))

// basic entry point
app.get('/', (req, res) => {
    res.render('index');
});

// function to generate title and description for results page
const generateWebpage = (dataItems) => {
    let mainTitle = `The Current Weather in ${dataItems.zipcode} is ${dataItems.temp}`
    let description = `The maximum temperature is ${dataItems.tempMax}, the minimum temperature is ${dataItems.tempMin}.
                       Currently outside it is: ${dataItems.tempDesc} degrees.`

    // passes json object for variables for pug file
    res.render('search', {title: mainTitle, description: description, localURL: dataItems.localURL, gifDescription: dataItems.gifTitle, gifURL: dataItems.gifURL});
}

// set up search results page
app.get('/search', (req, res) => {
    let zipcode = req.query.zip;
    // creates the actual api query url with paramaters and api key
    let openWeatherQuery = querystring.stringify({zip:zipcode, appid:CREDENTIALS["openWeather"].apikey})
    //console.log(req.query.zip)

    // ensures gif folder exists if not creates it
    try {
        fs.statSync('./gif');
    } catch(e) {
        fs.mkdirSync('./gif');
    }

    // function to generate title and description for results page
    const generateWebpage = (dataItems) => {
        let mainTitle = `The Current Weather in ${dataItems.zipcode} is ${dataItems.temp}`
        let description = `The maximum temperature is ${dataItems.tempMax}, the minimum temperature is ${dataItems.tempMin}.
                        Currently outside it is: ${dataItems.tempDesc} degrees.`

        // passes json object for variables for pug file
        res.render('search', {title: mainTitle, description: description, localURL: dataItems.localURL, gifDescription: dataItems.gifTitle, gifURL: dataItems.gifURL});
    }

    // starts api call for openweather 
    let openWeatherResult = https.request(OPENWEATHER.concat(openWeatherQuery), (res) => {
        // start gathering data from openweather request
        let weatherBody = '';
        res.on('data', (chunk) => {
            weatherBody += chunk;
        })

        // once json result download has completed;
        res.on('end', () => {
            let weatherJSON = JSON.parse(weatherBody);
            
            // handle error if api call fails
            if(weatherJSON.cod != 200){
                // generate error page if json status code is not 200
            }
            else{
                // parse json data to get needed data
                let desc = weatherJSON.weather[0].main;
                // convert kelvin to fahrenheit
                let temp = Math.round((weatherJSON.main.temp * (9/5)) - 459.67);
                let formatedTempMax = Math.round((weatherJSON.main.temp_max * (9/5)) - 459.67);
                let formatedTempMin = Math.round((weatherJSON.main.temp_min * (9/5)) - 459.67);
        
                // create a random integer to get an offset number so results are not always the same
                let giphyResultOffset = Math.floor(Math.random() * 25);
                // TODO: change to use new library
                let giphyQuery = querystring.stringify({api_key:CREDENTIALS["giphy"].apikey ,q:desc, offset:giphyResultOffset});

                // start of api call to giphy
                let giphyRequest = https.request(GIPHY.concat(giphyQuery), (res) => {
                    // start gathering data from giphy request
                    let giphyBody = '';
                    res.on('data', (chunk) => {
                        giphyBody += chunk;
                    })
                    // once json result download has completed
                    res.on('end', () => {
                        // parse data as json
                        let giphyJSON = JSON.parse(giphyBody);
                        // generate random number to get a random gif from the giphy result
                        let gifItemNumber = Math.floor(Math.random() * 20);
                        // get the id, url of the gif and title of the gif
                        let gifID = giphyJSON.data[gifItemNumber].id;
                        let gifURL = giphyJSON.data[gifItemNumber].images.downsized.url;
                        let gifTitle = giphyJSON.data[gifItemNumber].title;
                        // get the local url for the gif in the file system
                        let localGifURL = './gif/'.concat(gifID, '.gif');

                        // check if the gif is already in the file system
                        fs.access(localGifURL, fs.F_OK, (err) => {
                            // if not in file system download it
                            if(err){
                                let gifRequest = https.get(gifURL, function(res){
                                    let gifItem = fs.createWriteStream(localGifURL, {'encoding': null});
                                    res.pipe(gifItem);

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
                                // generate webpage right away if gif is already in file system
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