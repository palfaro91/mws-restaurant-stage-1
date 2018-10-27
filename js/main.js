let restaurants,
  neighborhoods,
  cuisines,
  nSelectedIdx = 0,
  cSelectedIdx = 0;
var newMap;
var markers = [];

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  registerServiceWorker();
  initMap(); // added
  fetchNeighborhoods();
  fetchCuisines();
});

/**
 * Online listner to sync offline requests
 */
window.addEventListener('online', e => {
  DBHelper.attemptFailedReqs().then(res =>{
    if(res && res.synced){
    console.log("res ",res );
      showToast(res.message, 'success-bg');
    }else{
      console.log("no res s");
    }
  }).catch(err => {
    console.log("something went wrong syncing! ", err);
  })
});

/**
 *
 * @param message The toast message
 * @param className Extra classes to append
 */

showToast = (message, className = "success-bg") => {
  Toastify({
    text: message,
    duration: 3500,
    gravity: 'bottom',
    positionLeft: false,
    className: `toasty ${className}`
  }).showToast();
};

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    option.setAttribute('aria-label', neighborhood);
    option.setAttribute('aria-selected', false);
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach((cuisine,idx) => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    option.setAttribute('aria-label', cuisine);
    option.setAttribute('aria-selected', false);
    select.append(option);
  });
}

/**
 * Initialize leaflet map, called from HTML.
 */
initMap = () => {
  self.newMap = L.map('map', {
        center: [40.722216, -73.987501],
        zoom: 12,
        scrollWheelZoom: false
      });
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
    mapboxToken: 'pk.eyJ1IjoicGFsZmFvciIsImEiOiJjamMwODZiYmkwNjFyMnFxaWpmYTRoZXh5In0.xix6-LzjLx0unmngYGcBQg',
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(newMap);

  updateRestaurants();
}
/* window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
} */

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  if (cIndex !== cSelectedIdx){
    let cChildren = Array.prototype.slice.call(cSelect.children);
    cChildren.forEach((node,idx) => {
      if (idx === cIndex){
        node.setAttribute('aria-selected', true);
        cSelectedIdx = cIndex;
      }else{
        node.setAttribute('aria-selected', false);
      }
    });
  }
  const nIndex = nSelect.selectedIndex;

  if (nIndex !== nSelectedIdx) {
    let nChildren = Array.prototype.slice.call(nSelect.children);
    nChildren.forEach((node, idx) => {
      if (idx === nIndex) {
        node.setAttribute('aria-selected', true);
        nSelectedIdx = nIndex;
      } else {
        node.setAttribute('aria-selected', false);
      }
    });
  }

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML(restaurants, neighborhood, cuisine);
    }
  })
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants, neighborhood = 'all neighborhoods', cuisine = 'all cuisines') => {
  const ul = document.getElementById('restaurants-list');
  const filterResults = document.getElementById('filter-results');

  if (neighborhood === 'all')
    neighborhood = 'all neighborhoods';
  if (cuisine === 'all')
    cuisine = 'all cuisines';

  filterResults.innerHTML = `${restaurants.length} results for ${cuisine} in ${neighborhood}`;
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.setAttribute('alt', restaurant.name);
  li.append(image);

  const infoContainer = document.createElement('div');
  infoContainer.classList.add('restaurant-card-body');
  infoContainer.classList.add('flex-auto');
  infoContainer.classList.add('layout-column');
  li.append(infoContainer);
  const name = document.createElement('h3');
  // name.classList.add('details-link');
  name.innerHTML = restaurant.name;
  // name.href = DBHelper.urlForRestaurant(restaurant);
  // name.setAttribute('aria-label', `View details about ${restaurant.name}`);
  infoContainer.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  infoContainer.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  infoContainer.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  more.setAttribute('aria-label', `View details about ${restaurant.name}`);
  infoContainer.append(more);

  const actions = document.createElement('div');
  actions.classList.add('restaurant-card-actions');
  actions.classList.add('flex-nogrow');
  actions.classList.add('layout-row');
  actions.classList.add('layout-align-end-end');

  const likeBtn = document.createElement('button');
  likeBtn.classList.add('button');
  likeBtn.classList.add('like-button');
  likeBtn.id = `restaurant-${restaurant.id}`;
  let isFavorite = (restaurant["is_favorite"] === true || restaurant["is_favorite"] === "true");
  if (isFavorite){
    likeBtn.classList.add('liked')
  }
  likeBtn.onclick = (ev) => updateFavorite(likeBtn.id, restaurant.id, isFavorite);

  actions.append(likeBtn);
  li.append(actions);
  return li
};

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
    marker.on("click", onClick);
    function onClick() {
      window.location.href = marker.options.url;
    }
  });
};
/**
 * pass in current favorite state for error handling
 * @param elementId
 * @param id
 * @param favoriteState
 */
updateFavorite = (elementId, id, favoriteState) => {
  var el = document.getElementById(elementId);
  el.disabled = true;
  el.onclick = null;
  DBHelper.updateFavorite(id, !favoriteState)
  .then(data => {
    if ('status' in (data || {}) && data.status === 'cached'){
      showToast('Liked status will be updated when network is available');
    }
    if (el.classList.contains('liked')){
      el.classList.remove('liked');
    }else{
      el.classList.add('liked');
    }
    console.log("Data ", data);
    el.disabled = false;
    el.onclick = (ev) => updateFavorite(elementId, id, !favoriteState);
  })
  .catch(err => {
    console.log("err " ,err);
    el.onclick = (ev) => updateFavorite(elementId, id, favoriteState);
    el.disabled = false;
  });
  console.log("id ", id , favoriteState);
};
