let array = [];
let isSorting = false;

// speed elements
const speedInput = document.getElementById("speed");
const speedValue = document.getElementById("speed-value");

// update speed text
speedInput.addEventListener("input", () => {
  speedValue.textContent = speedInput.value;
});

// helpers
function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function colorBars(bars, indices, color) {
  for (let i of indices) {
    if (bars[i]) bars[i].style.background = color;
  }
}

function resetBars(bars, indices) {
  for (let i of indices) {
    if (bars[i]) bars[i].style.background = "";
  }
}

function markSorted(bars, index) {
  if (bars[index]) bars[index].style.background = "green";
}

// generate array
function generateArray() {
  if (isSorting) return;

  array = [];
  const container = document.getElementById("array-container");
  container.innerHTML = "";

  for (let i = 0; i < 8; i++) {
    let value = Math.floor(Math.random() * 100) + 1;
    array.push(value);

    let bar = document.createElement("div");
    bar.classList.add("bar");
    bar.style.height = `${value * 3}px`;

    container.appendChild(bar);
  }
}

// sound
function playSound(value) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = ctx.createOscillator();

  oscillator.type = "sine";
  oscillator.frequency.value = 200 + value * 5;

  oscillator.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.05);
}

// main controller
async function startSort() {
  if (isSorting) return;

  isSorting = true;
  const algo = document.getElementById("algorithm").value;

  if (algo === "bubble") await bubbleSort();
  else if (algo === "selection") await selectionSort();
  else if (algo === "insertion") await insertionSort();
  else if (algo === "merge") await mergeSortWrapper();
  else if (algo === "quick") await quickSortWrapper();

  isSorting = false;
}

// ============================
// 🔁 BUBBLE SORT
// ============================
async function bubbleSort() {
  let bars = document.getElementsByClassName("bar");
  let speed = speedInput.value;

  for (let i = 0; i < array.length; i++) {
    for (let j = 0; j < array.length - i - 1; j++) {
      colorBars(bars, [j, j + 1], "yellow");
      await sleep(speed);

      if (array[j] > array[j + 1]) {
        colorBars(bars, [j, j + 1], "red");

        [array[j], array[j + 1]] = [array[j + 1], array[j]];

        bars[j].style.height = `${array[j] * 3}px`;
        bars[j + 1].style.height = `${array[j + 1] * 3}px`;

        playSound(array[j]);
        await sleep(speed);
      }

      resetBars(bars, [j, j + 1]);
    }
    markSorted(bars, array.length - i - 1);
  }
}

// ============================
// 🔁 SELECTION SORT
// ============================
async function selectionSort() {
  let bars = document.getElementsByClassName("bar");
  let speed = speedInput.value;

  for (let i = 0; i < array.length; i++) {
    let min = i;

    for (let j = i + 1; j < array.length; j++) {
      colorBars(bars, [j, min], "yellow");
      await sleep(speed);

      if (array[j] < array[min]) {
        resetBars(bars, [min]);
        min = j;
      }

      resetBars(bars, [j]);
    }

    if (min !== i) {
      colorBars(bars, [i, min], "red");

      [array[i], array[min]] = [array[min], array[i]];

      bars[i].style.height = `${array[i] * 3}px`;
      bars[min].style.height = `${array[min] * 3}px`;

      playSound(array[i]);
      await sleep(speed);
    }

    markSorted(bars, i);
  }
}

// ============================
// 🔁 INSERTION SORT
// ============================
async function insertionSort() {
  let bars = document.getElementsByClassName("bar");
  let speed = speedInput.value;

  for (let i = 1; i < array.length; i++) {
    let key = array[i];
    let j = i - 1;

    while (j >= 0 && array[j] > key) {
      colorBars(bars, [j, j + 1], "red");

      array[j + 1] = array[j];
      bars[j + 1].style.height = `${array[j + 1] * 3}px`;

      playSound(array[j]);

      await sleep(speed);
      resetBars(bars, [j, j + 1]);

      j--;
    }

    array[j + 1] = key;
    bars[j + 1].style.height = `${key * 3}px`;
  }

  // mark all sorted
  for (let i = 0; i < bars.length; i++) {
    markSorted(bars, i);
  }
}

// ============================
// 🔁 MERGE SORT
// ============================
async function mergeSortWrapper() {
  await mergeSort(0, array.length - 1);

  let bars = document.getElementsByClassName("bar");
  for (let i = 0; i < bars.length; i++) markSorted(bars, i);
}

async function mergeSort(l, r) {
  if (l >= r) return;

  let mid = Math.floor((l + r) / 2);

  await mergeSort(l, mid);
  await mergeSort(mid + 1, r);
  await merge(l, mid, r);
}

async function merge(l, mid, r) {
  let bars = document.getElementsByClassName("bar");
  let speed = speedInput.value;

  let left = array.slice(l, mid + 1);
  let right = array.slice(mid + 1, r + 1);

  let i = 0, j = 0, k = l;

  while (i < left.length && j < right.length) {
    colorBars(bars, [k], "yellow");
    await sleep(speed);

    if (left[i] <= right[j]) array[k++] = left[i++];
    else array[k++] = right[j++];

    bars[k - 1].style.height = `${array[k - 1] * 3}px`;
    playSound(array[k - 1]);

    resetBars(bars, [k - 1]);
  }

  while (i < left.length) {
    array[k] = left[i++];
    bars[k].style.height = `${array[k] * 3}px`;
    playSound(array[k]);
    await sleep(speed);
    k++;
  }

  while (j < right.length) {
    array[k] = right[j++];
    bars[k].style.height = `${array[k] * 3}px`;
    playSound(array[k]);
    await sleep(speed);
    k++;
  }
}

// ============================
// 🔁 QUICK SORT
// ============================
async function quickSortWrapper() {
  await quickSort(0, array.length - 1);

  let bars = document.getElementsByClassName("bar");
  for (let i = 0; i < bars.length; i++) markSorted(bars, i);
}

async function quickSort(low, high) {
  if (low < high) {
    let pi = await partition(low, high);
    await quickSort(low, pi - 1);
    await quickSort(pi + 1, high);
  }
}

async function partition(low, high) {
  let bars = document.getElementsByClassName("bar");
  let speed = speedInput.value;

  let pivot = array[high];
  colorBars(bars, [high], "purple");

  let i = low - 1;

  for (let j = low; j < high; j++) {
    colorBars(bars, [j], "yellow");
    await sleep(speed);

    if (array[j] < pivot) {
      i++;
      colorBars(bars, [i, j], "red");

      [array[i], array[j]] = [array[j], array[i]];

      bars[i].style.height = `${array[i] * 3}px`;
      bars[j].style.height = `${array[j] * 3}px`;

      playSound(array[i]);
      await sleep(speed);

      resetBars(bars, [i, j]);
    }

    resetBars(bars, [j]);
  }

  [array[i + 1], array[high]] = [array[high], array[i + 1]];

  bars[i + 1].style.height = `${array[i + 1] * 3}px`;
  bars[high].style.height = `${array[high] * 3}px`;

  playSound(array[i + 1]);

  return i + 1;
}

// initial load
window.onload = generateArray;