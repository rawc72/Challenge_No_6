// Define all the UI elements will be used
var searchCityTextBox = document.querySelector('#city');
var searchButton = document.querySelector('#search');
var historyPanel = document.querySelector('#history');
var weatherPanel = document.querySelector('#weather-panel');
var currentCityTitleElement = document.querySelector('#currentCity');
var currentIconElement = document.querySelector('#currentIcon');
var currentTempElement = document.querySelector('#currentTemp');
var currentWindElement = document.querySelector('#currentWind');
var currentHumidityElement = document.querySelector('#currentHumidity');
var currentUVElement = document.querySelector('#currentUVValue');
var futureCardsPanel = document.querySelector('#futureCards');

// Function to check if the city inputText box empty or not, if empty, disable the search button
function checkInput() {
    const city = searchCityTextBox.value;

    if (city.trim().length > 0) {
        searchButton.disabled = false;
    } else {
        searchButton.disabled = true;
    }
}

// Search city coordinates using open street map api, for example "London, England", "London, Ontario" or "New York"
async function search() {
    const city = makeNameNice(searchCityTextBox.value.trim());
    var cityLookUpURL =
        'https://nominatim.openstreetmap.org/search?q=' + city + '&format=json&limit=1';

    const response = await fetch(cityLookUpURL);
    const cityJson = await response.json();

    // Uncomment below statement to see what's being returned from the API call
    console.log(cityJson);
    var coordinates = {};

    if (cityJson && cityJson.length > 0) {
        coordinates.lat = cityJson[0].lat;
        coordinates.lon = cityJson[0].lon;

        // Save city name, lat, lon to local storage. So click history button don't have to call open street map to get coordinates again
        saveToLocalStorage(city, coordinates);
        // Clear text from input text box
        searchCityTextBox.value = '';
        searchButton.disabled = true;
    } else {
        // Alert user if city name is not found in open street map
        alert('City is not found!');
    }
}

// Save city, lat, lon to local storage. We will save it as key "cities"
function saveToLocalStorage(city, coordinates) {
    var fromStorage = localStorage.getItem('cities');

    var cityCOR = {};
    cityCOR.name = city;
    cityCOR.lat = coordinates.lat;
    cityCOR.lon = coordinates.lon;

    var cities = [];

    if (fromStorage !== null) {
        // Found history in local storage
        var fromStorageObj = JSON.parse(fromStorage);
        var storageIndex = findSameCityIndex(cityCOR.name, fromStorageObj);

        // Remove the old entry
        if (storageIndex !== -1) {
            fromStorageObj.splice(storageIndex, 1);
        }

        // Push the new entry. So the latest search entry will show up on the top
        fromStorageObj.push(cityCOR);
        cities = [...fromStorageObj];
    } else {
        // No history found in local storage
        cities.push(cityCOR);
        // Originally the right side panel is hidden. Un-hide it since we have at least one city to show
        weatherPanel.classList.remove('hide');
    }
    // Save the new search history back to local storage
    localStorage.setItem('cities', JSON.stringify(cities));

    // To populate left side history buttons
    populateHistory(cities);
}

// Function to return the city index from the array, match by name
function findSameCityIndex(vCity, obj) {
    var inx = -1;
    for (let i = 0; i < obj.length; i++) {
        if (obj[i].name.toLowerCase() === vCity.toLowerCase()) {
            inx = i;
            break;
        }
    }

    return inx;
}

// Async function to retrieve weather data based on lat, lon
async function retrieveWeather(city) {
    const lat = city.lat;
    const lon = city.lon;

    const weatherURL =
        'https://api.openweathermap.org/data/2.5/onecall?lat=' +
        lat +
        '&lon=' +
        lon +
        '&exclude=hourly,minutely&appid=8793424064af88ecfa3af87c2352b444&units=imperial';

    const response = await fetch(weatherURL);
    const weatherJson = await response.json();

    // Got the weather data, now populate right side for weather detail
    refreshWeatherPanel(city.name, weatherJson);
}

function makeNameNice(city) {
    //Regular expression to change every word first letter to upper case, make it looked nicer
    return city.replace(/(^\w{1})|(\s+\w{1})/g, (letter) => letter.toUpperCase());
}

function populateHistory(cities) {
    // Reverse the list, so latest search  item will show up on  top
    var historyList = cities.slice().reverse();

    // Each button has a onclick function - getWeather(city, lat, lon). So if clicked, right side weather panel will show that city
    const historyButtons = historyList.map(
        (item) =>
        `<button id="search" class="historyButton ripple" onclick="getWeather( '${item.name}', ${item.lat}, ${item.lon})">
            ${item.name}
        </button>`
    );

    // Push above dynamically generated buttons to history panel
    historyPanel.innerHTML = historyButtons.join('');

    retrieveWeather(historyList[0]);
}

function refreshWeatherPanel(city, weatherJson) {
    // Uncomment below to see city and weather data
    //   console.log(city);
    //   console.log(weatherJson);

    // Below populate UI elements by substituting weather data

    // For the city label, date shown as local time
    var cityTitle =
        city +
        '(' +
        moment()
        .utcOffset(weatherJson.timezone_offset / 60)
        .format('M/DD/YYYY') +
        ')';
    currentCityTitleElement.innerHTML = cityTitle;

    var weatherIcon = `<img alt="weather" src="http://openweathermap.org/img/wn/${weatherJson.current.weather[0].icon}.png" />`;
    currentIconElement.innerHTML = weatherIcon;

    currentTempElement.innerHTML = `Temp: ${weatherJson.current.temp}&deg;F`;

    currentWindElement.innerHTML = `Wind: ${weatherJson.current.wind_speed} MPH`;

    currentHumidityElement.innerHTML = `Humidity: ${weatherJson.current.humidity}%`;

    // UV index color logic
    var uvClass = '';
    if (weatherJson.current.uvi < 3) {
        uvClass = 'uvGreen';
    } else if (weatherJson.current.uvi < 6) {
        uvClass = 'uvYellow';
    } else if (weatherJson.current.uvi < 8) {
        uvClass = 'uvOrange';
    } else {
        uvClass = 'uvRed';
    }

    currentUVElement.innerHTML = `${weatherJson.current.uvi}`;
    currentUVElement.classList.add(uvClass);

    // Populate forecast panel
    refreshWeatherPanelForecast(weatherJson);
}

// Function to populate forecast panel
function refreshWeatherPanelForecast(weatherJson) {
    var cards = weatherJson.daily.map((day) => {
        // weather data return timestamp, use the timestamp to convert to local date
        var fDate = moment(day.dt * 1000)
            .utcOffset(weatherJson.timezone_offset / 60)
            .format('M/DD/YYYY');
        //<div><img alt="weather" src="http://openweathermap.org/img/wn/${day.weather[0].icon}.png" /></div>
        return `<div class="card">
                <div class="futureWeatherTextTitle">${fDate}</div>
                <div class="weatherIcon"><img alt="weather" src="http://openweathermap.org/img/wn/${day.weather[0].icon}.png" /></div>
                <div class="futureWeatherText">Temp: ${day.temp.day}&deg;F</div>
                <div class="futureWeatherText">Wind: ${day.wind_speed} MPH</div>
                <div class="futureWeatherText">Humidity: ${day.humidity}%</div>
            </div>`;
    });

    // Convert local time of the city
    const firstFutureDate = moment(weatherJson.daily[0].dt * 1000)
        .utcOffset(weatherJson.timezone_offset / 60)
        .format('M/DD/YYYY');
    const currentDate = moment()
        .utcOffset(weatherJson.timezone_offset / 60)
        .format('M/DD/YYYY');

    // API returns 8 days of data, skip first future date if is same as current date
    if (firstFutureDate === currentDate) {
        futureCardsPanel.innerHTML = cards.slice(1, 6).join('');
    } else {
        futureCardsPanel.innerHTML = cards.slice(0, 5).join('');
    }
}

// This function
function getWeather(city, lat, lon) {
    var cityCOR = {};
    cityCOR.name = city;
    cityCOR.lat = lat;
    cityCOR.lon = lon;
    retrieveWeather(cityCOR);
}

function loadLocalStorage() {
    var fromStorage = localStorage.getItem('cities');

    if (fromStorage !== null) {
        var fromStorageObj = JSON.parse(fromStorage);
        populateHistory(fromStorageObj);
        // if has history in local storage, we show the right side panel to show the latest city weather
        weatherPanel.classList.remove('hide');
    }
}

// This is the entry point when page reload
window.addEventListener(
    'DOMContentLoaded',
    function() {
        loadLocalStorage();
    },
    false
);