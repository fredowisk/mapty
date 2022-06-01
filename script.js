'use strict';

let workoutElement;
const form = document.querySelector('.form');
const editButton = document.querySelector('.form__edit__btn');
const deleteButton = document.querySelector('.form__delete__btn');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const deleteAllButton = document.querySelector('.delete__all__btn');

class Workout {
  date = new Date();
  id = String(Date.now()).slice(-10);
  clicks = 0;
  constructor(coordinates, distance, duration) {
    this.coordinates = coordinates;
    this.distance = distance; //km
    this.duration = duration; //min
  }

  _setDescription() {
    this.description = `${
      this.type === 'running' ? '🏃🏻‍♂️ Running' : '🚴🏻‍♂️ Cycling'
    } on ${this.date.toLocaleDateString('en-us', {
      day: 'numeric',
      month: 'long',
    })}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coordinates, distance, duration, cadence) {
    super(coordinates, distance, duration);
    this.cadence = cadence;
    this.caculatePace();
    this._setDescription();
  }

  caculatePace() {
    // min/km
    return (this.pace = this.duration / this.distance);
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coordinates, distance, duration, elevation) {
    super(coordinates, distance, duration);
    this.elevation = elevation;
    this.caculateSpeed();
    this._setDescription();
  }

  caculateSpeed() {
    // km/h
    return (this.speed = this.distance / (this.duration / 60));
  }
}

class App {
  #map;
  #mapZoomLevel = 15;
  #mapEvent;
  #workouts = [];

  constructor() {
    this._getPosition();
    this._getLocalStorage();

    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    editButton.addEventListener('click', this._editWorkout.bind(this));
    deleteButton.addEventListener('click', this._deleteWorkout.bind(this));
    deleteAllButton.addEventListener('click', this._deleteAll.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    this.#map = L.map('map').setView([latitude, longitude], this.#mapZoomLevel);

    L.tileLayer(
      'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }
    ).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    setTimeout(() => {
      this.#workouts.forEach(currentWorkout => {
        this._renderWorkout(currentWorkout);
      });
    }, 2000);
  }

  _clearFields() {
    inputDistance.value = '';
    inputDuration.value = '';
    inputCadence.value = '';
    inputElevation.value = '';

    editButton.style.display = 'none';
    deleteButton.style.display = 'none';
    const workoutElements = document.querySelectorAll('.workout');

    workoutElements.forEach(
      element => (element.style.backgroundColor = '#42484d')
    );
  }

  _showForm(event) {
    inputType.disabled = false;
    this.#mapEvent = event;
    form.classList.remove('hidden');

    this._clearFields();

    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value = '';
    inputDuration.value = '';
    inputCadence.value = '';
    inputElevation.value = '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 500);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _validateInputs(inputs) {
    return inputs.every(input => Number.isFinite(input) && input > 0);
  }

  _getInputs() {
    const type = inputType.value;
    const distance = Number(inputDistance.value);
    const duration = Number(inputDuration.value);

    return { distance, duration, type };
  }

  _newWorkout(event) {
    event.preventDefault();

    let workout;
    if (!this.#mapEvent) return;
    const { lat, lng } = this.#mapEvent.latlng;
    const { distance, duration, type } = this._getInputs();

    if (type === 'running') {
      const cadence = Number(inputCadence.value);

      if (!this._validateInputs([distance, duration, cadence]))
        return alert('Inputs have to be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    if (type === 'cycling') {
      const elevation = Number(inputElevation.value) || 'a';

      if (
        !this._validateInputs([distance, duration]) ||
        !Number.isFinite(elevation)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    this.#workouts.push(workout);

    this._renderWorkoutMarker(workout);
    this._renderWorkout(workout);
    this._hideForm();
    this._setLocalStorage();
  }

  _editWorkout(event) {
    event.preventDefault();
    const { distance, duration } = this._getInputs();

    if (this.workout.type === 'running') {
      const cadence = Number(inputCadence.value);
      if (!this._validateInputs([distance, duration, cadence]))
        return alert('Inputs have to be positive numbers!');
      this.workout.distance = distance;
      this.workout.duration = duration;
      this.workout.cadence = cadence;
    }
    if (this.workout.type === 'cycling') {
      const elevation = Number(inputElevation.value) || 'a';
      if (
        !this._validateInputs([distance, duration]) ||
        !Number.isFinite(elevation)
      )
        return alert('Inputs have to be positive numbers!');

      this.workout.distance = distance;
      this.workout.duration = duration;
      this.workout.elevation = elevation;
    }

    const existentWorkoutIndex = this.#workouts.findIndex(
      item => item.id === this.workout.id
    );

    if (existentWorkoutIndex >= 0) {
      this.#workouts[existentWorkoutIndex] = this.workout;

      workoutElement.remove();
      this._renderWorkout(this.workout);
      this._hideForm();
      this._setLocalStorage();
      return;
    }
    return;
  }

  _deleteWorkout(event) {
    event.preventDefault();

    const existentWorkoutIndex = this.#workouts.findIndex(
      item => item.id === this.workout.id
    );
    if (existentWorkoutIndex >= 0) {
      this.#workouts.splice(existentWorkoutIndex, 1);

      workoutElement.remove();
      this._hideForm();
      this._setLocalStorage();
      return;
    }
    return;
  }

  _deleteAll(event) {
    event.preventDefault();

    containerWorkouts
      .querySelectorAll('.workout')
      .forEach(element => element.remove());

    document
      .querySelectorAll('.leaflet-popup-content')
      .forEach(element => element.remove());

    this.#workouts = [];
    this._hideForm();
    this._setLocalStorage();
  }

  _renderWorkoutMarker({ coordinates, type, description }) {
    L.marker(coordinates)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${type}-popup`,
        })
      )
      .setPopupContent(description)
      .openPopup();
  }

  _renderWorkout({
    id,
    type,
    distance,
    duration,
    description,
    pace,
    cadence,
    speed,
    elevation,
  }) {
    let html = ` 
      <li class="workout workout--${type}" data-id="${id}">
      <h2 class="workout__title">${description}</h2>
      <div class="workout__details">
        <span class="workout__icon">${type === 'running' ? '🏃🏻‍♂️' : '🚴🏻‍♂️'}
        </span>
        <span class="workout__value">${distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${duration}</span>
        <span class="workout__unit">min</span>
      </div>
    `;

    if (type === 'running')
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
  `;

    if (type === 'cycling')
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${elevation}</span>
        <span class="workout__unit">m</span>
      </div>
`;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(event) {
    if (!event.target.closest('.workout')) return;
    workoutElement = event.target.closest('.workout');
    const workoutElements = document.querySelectorAll('.workout');

    this.workout = this.#workouts.find(
      element => element.id === workoutElement.dataset.id
    );

    const {
      coordinates,
      distance,
      duration,
      cadence = '',
      elevation = '',
    } = this.workout;

    this._showForm();
    inputDistance.value = distance;
    inputDuration.value = duration;
    inputCadence.value = cadence;
    inputElevation.value = elevation;
    editButton.style.display = 'flex';
    deleteButton.style.display = 'flex';

    workoutElement.style.backgroundColor = 'red';
    workoutElements.forEach(element => {
      if (element !== workoutElement) element.style.backgroundColor = '#42484d';
    });

    this.#map.setView(coordinates, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const savedWorkouts = JSON.parse(localStorage.getItem('workouts'));

    if (!savedWorkouts) return;

    this.#workouts = savedWorkouts;

    setTimeout(() => {
      this.#workouts.forEach(currentWorkout => {
        this._renderWorkoutMarker(currentWorkout);
      });
    }, 2000);
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
