'use strict'

class Workout {
  date = new Date()
  id = (Date.now() + '').slice(-10)
  clicks = 0
  constructor(distance, duration, coords) {
    this.distance = distance // in Km
    this.duration = duration // in min
    this.coords = coords // [lat, lng]
  }

  // Running on April 14
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`
  }

  click() {
    this.clicks++
  }
}

class Running extends Workout {
  type = 'running'
  constructor(distance, duration, coords, cadence) {
    super(distance, duration, coords)
    this.cadence = cadence
    this.calcPace()
    this._setDescription()
  }

  calcPace() {
    // min/Km
    this.pace = this.duration / this.distance
    return this.pace
  }
}

class Cycling extends Workout {
  type = 'cycling'
  constructor(distance, duration, coords, elevationGain) {
    super(distance, duration, coords)
    this.elevationGain = elevationGain
    this.calcSpeed()
    this._setDescription()
  }

  calcSpeed() {
    // Km/h
    this.speed = this.distance / (this.duration / 60)
    return this.speed
  }
}

const running1 = new Running(24, 5.2, [39, -12], 178)
const cycling1 = new Cycling(95, 27, [39, -12], 523)

////////////////////////////
// App Architecture
const form = document.querySelector('.form')
const containerWorkouts = document.querySelector('.workouts')
const inputType = document.querySelector('.form__input--type')
const inputDistance = document.querySelector('.form__input--distance')
const inputDuration = document.querySelector('.form__input--duration')
const inputCadence = document.querySelector('.form__input--cadence')
const inputElevation = document.querySelector('.form__input--elevation')

class App {
  #map
  #mapZoom = 13
  #mapE
  #workouts = []
  constructor() {
    // Get user position
    this._getPosition()

    // Get data from local storage
    this._getLocalStorage()

    // Attatch event handlers
    form.addEventListener('submit', this._newWorkout.bind(this))
    inputType.addEventListener('change', this._toggleElevationField)
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this))
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert(`couldn't get your current position`)
        }
      )
  }

  _loadMap(pos) {
    const { latitude, longitude } = pos.coords
    const coords = [latitude, longitude]

    this.#map = L.map('map').setView(coords, this.#mapZoom)

    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.#map)

    this.#map.on('click', this._showForm.bind(this))

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work)
    })
  }

  _showForm(e) {
    this.#mapE = e
    form.classList.remove('hidden')
    inputDistance.focus()
  }

  _hideForm() {
    inputDistance.value =
      inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        ''
    form.style.display = 'none'
    form.classList.add('hidden')
    setTimeout(() => (form.style.display = 'grid'), 1000)
  }

  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden')
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden')
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(input => Number.isFinite(input))

    const allPositive = (...inputs) => inputs.every(input => input > 0)

    // get form data
    const type = inputType.value
    const distance = +inputDistance.value
    const duration = +inputDuration.value
    const { lat, lng } = this.#mapE.latlng
    let workout

    e.preventDefault()

    // running workout
    // Check data validation
    if (type === 'running') {
      const cadence = +inputCadence.value
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to positive numbers!')
      workout = new Running(distance, duration, [lat, lng], cadence)
    }
    // or cycling workout
    // Check data validation
    if (type === 'cycling') {
      const elevation = +inputElevation.value
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to positive numbers!')
      workout = new Cycling(distance, duration, [lat, lng], elevation)
    }
    // push it to array
    this.#workouts.push(workout)

    // Display Marker
    this._renderWorkoutMarker(workout)

    // render it to the list
    this._renderWorkout(workout)

    // Clear input fields
    this._hideForm()

    // Set local storage to all workouts
    this._setLocalStorage()
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup()
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id='${workout.id}'>
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance.toFixed(1)}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `
    if (workout.type === 'running')
      html += `
            <div class="workout__details">
              <span class="workout__icon">⚡️</span>
              <span class="workout__value">${workout.pace.toFixed(1)}</span>
              <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">🦶🏼</span>
              <span class="workout__value">${workout.cadence}</span>
              <span class="workout__unit">spm</span>
            </div>
      </li>
      `
    if (workout.type === 'cycling')
      html += `
            <div class="workout__details">
              <span class="workout__icon">⚡️</span>
              <span class="workout__value">${workout.speed.toFixed(1)}</span>
              <span class="workout__unit">km/h</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">⛰</span>
              <span class="workout__value">${workout.elevationGain}</span>
              <span class="workout__unit">m</span>
            </div>
      </li>
      `
    form.insertAdjacentHTML('afterend', html)
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout')
    if (!workoutEl) return
    const workout = this.#workouts.find(
      workout => workout.id === workoutEl.dataset.id
    )

    this.#map.setView(workout.coords, this.#mapZoom, {
      animate: true,
      pan: {
        duration: 1
      }
    })

    // Using the public Interface
    workout.click()
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts))
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'))
    console.log(data)

    if (!data) return

    this.#workouts = data
    this.#workouts.forEach(work => this._renderWorkout(work))
  }

  reset() {
    localStorage.removeItem('workouts')
    location.reload()
  }
}

const appObj = new App()
