// ============================================================
// STATE
// ============================================================
let array = [];
let isSorting = false;
let stopRequested = false;
let selectedAlgo = "bubble";
let soundEnabled = true;
let startTime = null;
let timerInterval = null;

// Stats counters
let comparisons = 0;
let swaps = 0;
let arrayAccesses = 0;

// Audio context — reuse one instance to prevent mid-sort cutoff
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

// ============================================================
// ELEMENTS
// ============================================================
const sizeInput   = document.getElementById("size-input");
const sizeVal     = document.getElementById("size-val");
const delayInput  = document.getElementById("delay-input");
const delayVal    = document.getElementById("delay-val");
const soundToggle = document.getElementById("sound-toggle");
const startBtn    = document.getElementById("start-btn");
const stopBtn     = document.getElementById("stop-btn");
const generateBtn = document.getElementById("generate-btn");
const visStatus   = document.getElementById("vis-status");
const algoLabel   = document.getElementById("algo-label");

// Stats elements
const statComp  = document.getElementById("stat-comp");
const statSwap  = document.getElementById("stat-swap");
const statAcc   = document.getElementById("stat-acc");
const statTime  = document.getElementById("stat-time");

// ============================================================
// ALGORITHM INFO
// ============================================================
const ALGO_INFO = {
  bubble:    { name: "Bubble Sort",    best: "O(n)", avg: "O(n²)", worst: "O(n²)", space: "O(1)",       desc: "Repeatedly steps through the list, compares adjacent elements and swaps them if out of order. Simple but slow for large datasets." },
  selection: { name: "Selection Sort", best: "O(n²)", avg: "O(n²)", worst: "O(n²)", space: "O(1)",      desc: "Finds the minimum element and places it at the start, then repeats for the remaining unsorted portion. Always O(n²) comparisons." },
  insertion: { name: "Insertion Sort", best: "O(n)", avg: "O(n²)", worst: "O(n²)", space: "O(1)",       desc: "Builds the sorted array one item at a time by inserting each element into its correct position. Efficient for small or nearly-sorted arrays." },
  merge:     { name: "Merge Sort",     best: "O(n log n)", avg: "O(n log n)", worst: "O(n log n)", space: "O(n)", desc: "Divides the array into halves, recursively sorts each half, then merges them. Guaranteed O(n log n) but requires extra space." },
  quick:     { name: "Quick Sort",     best: "O(n log n)", avg: "O(n log n)", worst: "O(n²)", space: "O(log n)", desc: "Picks a pivot element and partitions the array around it. Very fast in practice; worst case O(n²) with poor pivot choice." },
};

function updateAlgoInfo(algo) {
  const info = ALGO_INFO[algo];
  document.getElementById("info-name").textContent  = info.name;
  document.getElementById("c-best").textContent     = info.best;
  document.getElementById("c-avg").textContent      = info.avg;
  document.getElementById("c-worst").textContent    = info.worst;
  document.getElementById("c-space").textContent    = info.space;
  document.getElementById("info-desc").textContent  = info.desc;
  algoLabel.textContent = info.name.toUpperCase();
}

// ============================================================
// EVENT LISTENERS
// ============================================================
sizeInput.addEventListener("input", () => {
  sizeVal.textContent = sizeInput.value;
  if (!isSorting) generateArray();
});

delayInput.addEventListener("input", () => {
  delayVal.textContent = delayInput.value;
});

soundToggle.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundToggle.textContent = soundEnabled ? "🔊 ON" : "🔇 OFF";
  soundToggle.classList.toggle("active", soundEnabled);
});

document.getElementById("algo-grid").addEventListener("click", (e) => {
  const btn = e.target.closest(".algo-btn");
  if (!btn || isSorting) return;
  document.querySelectorAll(".algo-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  selectedAlgo = btn.dataset.algo;
  updateAlgoInfo(selectedAlgo);
});

// ============================================================
// HELPERS
// ============================================================
function sleep(ms) {
  return new Promise((res, rej) => {
    const t = setTimeout(res, ms);
    // Will reject if stop requested, handled in sort loops
    if (stopRequested) { clearTimeout(t); rej(new Error("stop")); }
  });
}

async function checkStop() {
  if (stopRequested) throw new Error("stop");
}

function getDelay() { return parseInt(delayInput.value, 10); }

function getBars() { return document.getElementsByClassName("bar"); }

// Bar color helpers using classes instead of inline styles
function setBarClass(bar, cls) {
  bar.className = "bar";
  if (cls) bar.classList.add(cls);
}

function resetBar(bars, i) {
  if (bars[i]) bars[i].className = "bar";
}

function compareBar(bars, i) {
  if (bars[i]) { bars[i].className = "bar compare"; }
}

function swapBar(bars, i) {
  if (bars[i]) { bars[i].className = "bar swap"; }
}

function sortedBar(bars, i) {
  if (bars[i]) { bars[i].className = "bar sorted"; }
}

function pivotBar(bars, i) {
  if (bars[i]) { bars[i].className = "bar pivot"; }
}

// ============================================================
// SOUND — robust oscillator with proper cleanup
// ============================================================
function playSound(value) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(180 + value * 4, ctx.currentTime);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);

    // Cleanup
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  } catch (e) { /* silently ignore audio errors */ }
}

// ============================================================
// STATS
// ============================================================
function resetStats() {
  comparisons = 0; swaps = 0; arrayAccesses = 0;
  statComp.textContent = "0";
  statSwap.textContent = "0";
  statAcc.textContent  = "0";
  statTime.textContent = "0ms";
}

function incComp()  { statComp.textContent = ++comparisons; }
function incSwap()  { statSwap.textContent = ++swaps; }
function incAcc(n=1) { arrayAccesses += n; statAcc.textContent = arrayAccesses; }

function startTimer() {
  startTime = Date.now();
  timerInterval = setInterval(() => {
    statTime.textContent = (Date.now() - startTime) + "ms";
  }, 50);
}

function stopTimer() {
  clearInterval(timerInterval);
  if (startTime) statTime.textContent = (Date.now() - startTime) + "ms";
}

// ============================================================
// GENERATE ARRAY
// ============================================================
function generateArray() {
  if (isSorting) return;
  resetStats();
  setStatus("READY");

  array = [];
  const n = parseInt(sizeInput.value, 10);
  const container = document.getElementById("array-container");
  container.innerHTML = "";

  for (let i = 0; i < n; i++) {
    let value = Math.floor(Math.random() * 90) + 10;
    array.push(value);

    const bar = document.createElement("div");
    bar.classList.add("bar");
    bar.style.height = `${value * 2.8}px`;
    container.appendChild(bar);
  }
}

function setStatus(text, cls = "") {
  visStatus.textContent = text;
  visStatus.className = "vis-status " + cls;
}

function setUILocked(locked) {
  startBtn.disabled    = locked;
  generateBtn.disabled = locked;
  stopBtn.disabled     = !locked;
  sizeInput.disabled   = locked;
  document.querySelectorAll(".algo-btn").forEach(b => b.disabled = locked);
}

// ============================================================
// SORT CONTROLLER
// ============================================================
async function startSort() {
  if (isSorting) return;
  isSorting = true;
  stopRequested = false;

  setUILocked(true);
  setStatus("RUNNING", "running");
  resetStats();
  startTimer();

  try {
    if (selectedAlgo === "bubble")    await bubbleSort();
    else if (selectedAlgo === "selection") await selectionSort();
    else if (selectedAlgo === "insertion") await insertionSort();
    else if (selectedAlgo === "merge")     await mergeSortWrapper();
    else if (selectedAlgo === "quick")     await quickSortWrapper();

    // Mark all sorted only if completed (not stopped)
    const bars = getBars();
    for (let i = 0; i < bars.length; i++) sortedBar(bars, i);
    setStatus("SORTED ✓", "done");
  } catch (e) {
    if (e.message === "stop") {
      setStatus("STOPPED", "");
    }
  } finally {
    stopTimer();
    isSorting = false;
    stopRequested = false;
    setUILocked(false);
  }
}

function stopSort() {
  stopRequested = true;
}

// ============================================================
// BUBBLE SORT
// ============================================================
async function bubbleSort() {
  const bars = getBars();
  for (let i = 0; i < array.length; i++) {
    for (let j = 0; j < array.length - i - 1; j++) {
      await checkStop();
      incAcc(2); incComp();

      compareBar(bars, j); compareBar(bars, j + 1);
      await sleep(getDelay());

      if (array[j] > array[j + 1]) {
        swapBar(bars, j); swapBar(bars, j + 1);
        incSwap(); incAcc(2);

        [array[j], array[j + 1]] = [array[j + 1], array[j]];
        bars[j].style.height     = `${array[j] * 2.8}px`;
        bars[j + 1].style.height = `${array[j + 1] * 2.8}px`;

        playSound(array[j]);
        await sleep(getDelay());
      }

      resetBar(bars, j); resetBar(bars, j + 1);
    }
    sortedBar(bars, array.length - i - 1);
  }
}

// ============================================================
// SELECTION SORT
// ============================================================
async function selectionSort() {
  const bars = getBars();
  for (let i = 0; i < array.length; i++) {
    let min = i;
    compareBar(bars, min);

    for (let j = i + 1; j < array.length; j++) {
      await checkStop();
      incAcc(2); incComp();
      compareBar(bars, j);
      await sleep(getDelay());

      if (array[j] < array[min]) {
        resetBar(bars, min);
        min = j;
        compareBar(bars, min);
      } else {
        resetBar(bars, j);
      }
    }

    if (min !== i) {
      swapBar(bars, i); swapBar(bars, min);
      incSwap(); incAcc(2);

      [array[i], array[min]] = [array[min], array[i]];
      bars[i].style.height   = `${array[i] * 2.8}px`;
      bars[min].style.height = `${array[min] * 2.8}px`;

      playSound(array[i]);
      await sleep(getDelay());
    }

    resetBar(bars, min);
    sortedBar(bars, i);
  }
}

// ============================================================
// INSERTION SORT
// ============================================================
async function insertionSort() {
  const bars = getBars();
  for (let i = 1; i < array.length; i++) {
    let key = array[i];
    let j = i - 1;

    while (j >= 0) {
      await checkStop();
      incAcc(1); incComp();

      if (array[j] <= key) break;

      swapBar(bars, j); swapBar(bars, j + 1);
      incAcc(2);

      array[j + 1] = array[j];
      bars[j + 1].style.height = `${array[j + 1] * 2.8}px`;

      playSound(array[j]);
      await sleep(getDelay());

      resetBar(bars, j); resetBar(bars, j + 1);
      j--;
    }

    array[j + 1] = key;
    bars[j + 1].style.height = `${key * 2.8}px`;
    incAcc(1);
  }
}

// ============================================================
// MERGE SORT
// ============================================================
async function mergeSortWrapper() {
  await mergeSort(0, array.length - 1);
}

async function mergeSort(l, r) {
  await checkStop();
  if (l >= r) return;
  const mid = Math.floor((l + r) / 2);
  await mergeSort(l, mid);
  await mergeSort(mid + 1, r);
  await merge(l, mid, r);
}

async function merge(l, mid, r) {
  const bars = getBars();
  const left  = array.slice(l, mid + 1);
  const right = array.slice(mid + 1, r + 1);
  let i = 0, j = 0, k = l;

  while (i < left.length && j < right.length) {
    await checkStop();
    incAcc(2); incComp();

    compareBar(bars, k);
    await sleep(getDelay());

    if (left[i] <= right[j]) { array[k] = left[i++]; }
    else                      { array[k] = right[j++]; }

    incAcc(1);
    bars[k].style.height = `${array[k] * 2.8}px`;
    playSound(array[k]);
    resetBar(bars, k);
    k++;
  }

  while (i < left.length) {
    await checkStop();
    array[k] = left[i++];
    incAcc(1);
    bars[k].style.height = `${array[k] * 2.8}px`;
    playSound(array[k]);
    await sleep(getDelay());
    k++;
  }

  while (j < right.length) {
    await checkStop();
    array[k] = right[j++];
    incAcc(1);
    bars[k].style.height = `${array[k] * 2.8}px`;
    playSound(array[k]);
    await sleep(getDelay());
    k++;
  }
}

// ============================================================
// QUICK SORT
// ============================================================
async function quickSortWrapper() {
  await quickSort(0, array.length - 1);
}

async function quickSort(low, high) {
  await checkStop();
  if (low < high) {
    const pi = await partition(low, high);
    await quickSort(low, pi - 1);
    await quickSort(pi + 1, high);
  }
}

async function partition(low, high) {
  const bars = getBars();
  const pivot = array[high];
  incAcc(1);
  pivotBar(bars, high);
  let i = low - 1;

  for (let j = low; j < high; j++) {
    await checkStop();
    incAcc(1); incComp();

    compareBar(bars, j);
    await sleep(getDelay());

    if (array[j] < pivot) {
      i++;
      swapBar(bars, i); swapBar(bars, j);
      incSwap(); incAcc(2);

      [array[i], array[j]] = [array[j], array[i]];
      bars[i].style.height = `${array[i] * 2.8}px`;
      bars[j].style.height = `${array[j] * 2.8}px`;

      playSound(array[i]);
      await sleep(getDelay());
      resetBar(bars, i);
    }

    resetBar(bars, j);
  }

  // Place pivot
  incSwap(); incAcc(2);
  [array[i + 1], array[high]] = [array[high], array[i + 1]];
  bars[i + 1].style.height = `${array[i + 1] * 2.8}px`;
  bars[high].style.height  = `${array[high] * 2.8}px`;
  playSound(array[i + 1]);
  sortedBar(bars, i + 1);

  return i + 1;
}

// ============================================================
// INIT
// ============================================================
window.onload = () => {
  updateAlgoInfo(selectedAlgo);
  generateArray();
};
