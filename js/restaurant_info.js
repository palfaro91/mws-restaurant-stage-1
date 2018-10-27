let restaurant;
var newMap;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  initMap();
  registerServiceWorker();
});
/**
* Online listner to sync offline requests
*/
window.addEventListener('online', e => {
  DBHelper.attemptFailedReviews().then(res =>{
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
 * Initialize leaflet map
 */
initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
        scrollWheelZoom: false,
      });
      L.tileLayer(
          'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}',
          {
            mapboxToken: 'pk.eyJ1IjoicGFsZmFvciIsImEiOiJjamMwODZiYmkwNjFyMnFxaWpmYTRoZXh5In0.xix6-LzjLx0unmngYGcBQg',
            maxZoom: 18,
            attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
                '<a href="https://creativecommons.org/licenses/by-sa/2.0/" tabindex="-1">CC-BY-SA</a>, ' +
                'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
            id: 'mapbox.streets',
          }).addTo(newMap);
      document.getElementById('map').setAttribute('tabindex', '-1');
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
    }
  });
};

/* window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
} */

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant);
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    let error = 'No restaurant id in URL';
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        fillError(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant);
    });
    DBHelper.fetchReviewsForRestaurant((err, data) =>{
      if (err) {
        console.log(err,"err");
      }
      console.log("data", data);
      self.reviews = data;
      fillReviewsHTML(data);
    }, id);
  }
};

/**
 * Display error
 */

fillError = (err) => {
  const container = document.createElement('div'),
      errorText = document.createElement('h2'),
      main = document.getElementById('restaurant-container'),
      infoDiv = document.getElementById('restaurant-info'),
      reviewsCont = document.getElementById('reviews-container');
  container.style.height = '100%';
  container.classList.add('layout-column');
  container.classList.add('layout-align-center-center');
  container.classList.add('flex');
  main.classList.add('flex');
  errorText.innerText = 'Restaurant not found';
  container.append(errorText);
  infoDiv.style.display = reviewsCont.style.display = 'none';
  infoDiv.style.visibility = reviewsCont.style.visibility = 'hidden';
  main.append(container);
};

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;
  address.setAttribute('aria-label',
      `Restaurant address ${restaurant.address}`);

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img';
  image.setAttribute('alt', `${restaurant.name} image`);
  image.src = DBHelper.imageUrlForRestaurant(restaurant);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;
  cuisine.setAttribute('aria-label', `${restaurant.cuisine_type} cuisine`);

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
};

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    day.setAttribute('tabindex', '0');
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    time.setAttribute('tabindex', '0');
    row.appendChild(time);

    hours.appendChild(row);
  }
};

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const contentContainer = document.createElement('div');
  container.appendChild(contentContainer);

  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  title.setAttribute('tabindex', '0');
  contentContainer.appendChild(title);
  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    contentContainer.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  contentContainer.appendChild(ul);
};

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review, append) => {
  const li = document.createElement('li');
  li.classList.add('rounded-top-left');

  const reviewHeader = document.createElement('div');
  reviewHeader.classList.add('review-header', 'p-20', 'rounded-top-left');

  const name = document.createElement('span');
  name.innerHTML = review.name;
  name.classList.add('name');
  name.setAttribute('tabindex', '0');
  name.setAttribute('aria-label', `Review by ${review.name}`);
  reviewHeader.appendChild(name);

  const date = document.createElement('span');
  date.innerHTML = new Date(review.createdAt).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric' });
  date.classList.add('date');
  date.setAttribute('tabindex', '0');
  // date.setAttribute('aria-label', `Review left on ${review.date}`);
  reviewHeader.appendChild(date);
  li.appendChild(reviewHeader);

  const reviewContent = document.createElement('div');
  reviewContent.classList.add('p-20');

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  rating.classList.add('rating');
  // rating.setAttribute('aria-label', `Rating ${review.rating}`);
  rating.setAttribute('tabindex', '0');
  reviewContent.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  comments.classList.add('comments');
  reviewContent.appendChild(comments);
  // comments.setAttribute('aria-label', `Review content: ${review.comments}`);
  comments.setAttribute('tabindex', '0');
  li.appendChild(reviewContent);
  if (append === true){
    const list = document.getElementById('reviews-list');
    list.appendChild(li);
    return;
  }
  return li;
};

/**
 * Post the Review
 */

postReview = (event) => {
  console.log("posting ", event);
  event.preventDefault();
  const button = document.getElementById('submit-btn');
  button.disabled = true;
  button.classList.add('disabled');
  const firstName = document.getElementById('first-name').value,
      lastName = document.getElementById('last-name').value || '';
  const review = {
    name: `${firstName} ${lastName}`,
    rating: +document.getElementById('rating').value,
    comments: document.getElementById('review-text').value,
    restaurant_id: getParameterByName('id')
  }
  DBHelper.postReview(review)
  .then( res => {
    button.classList.remove('disabled-submit');
    button.disabled = false;
    if (res.error ){
      showToast(res.message, "error-bg");
    }else{
      if ('status' in (res || {}) && res.status === 'cached'){
        showToast('Your review will be posted when network is available');
        createReviewHTML(res.review, true);
      } else{
        showToast("Thanks for leaving a review");
        createReviewHTML(res, true);
      }
      clearForm();
    }
  })
  .catch(err => {
    button.classList.remove('disabled-submit');
    button.disabled = false;
  })
};

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
};

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
      results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
};
showToast = (message, className = "success-bg") => {
  Toastify({
    text: message,
    duration: 3000,
    gravity: 'bottom',
    positionLeft: false,
    className: `toasty ${className}`
  }).showToast();
};
/**
 * Clear form on submit
 */
clearForm = () => {
  const form = document.getElementById('review-form');
  if (!form) return;
  const inputs = [].slice.call(form.querySelectorAll("input, textarea, select"));
  inputs.forEach(input => {
    switch (input.nodeName) {
      case "SELECT":
        input.value = 5;
           break;
      case "INPUT":
      case "TEXTAREA":
        input.value = "";
           break;
        default:

    }
  });
  form.reset();
};
