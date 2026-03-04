// backend/utils/heapScheduler.js
// ─────────────────────────────────────────────────────────────────────────────
// MaxHeap-based Priority Scheduler for Appointments
//
// Priority Score Breakdown (higher = served first):
//   isEmergency flag             → +100
//   High-severity keyword match  → +50 each  (heart attack, stroke, etc.)
//   Medium-severity keyword      → +30 each  (breathing difficulty, fracture, etc.)
//   Other emergency keyword      → +20 each
//   Time urgency (sooner = more) → 0..+20   (linear decay over 20 days)
// ─────────────────────────────────────────────────────────────────────────────

const HIGH_SEVERITY   = ['chest pain', 'heart attack', 'stroke', 'unconscious', 'severe bleeding', 'seizure'];
const MEDIUM_SEVERITY = ['difficulty breathing', 'breathing difficulty', 'accident', 'fracture', 'fever'];

class MaxHeap {
  constructor() {
    this.heap = []; // [{ priority: Number, data: Appointment }]
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  insert(appointment) {
    const node = { priority: MaxHeap.calculatePriority(appointment), data: appointment };
    this.heap.push(node);
    this._bubbleUp(this.heap.length - 1);
  }

  extractMax() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop().data;
    const max = this.heap[0].data;
    this.heap[0] = this.heap.pop();
    this._sinkDown(0);
    return max;
  }

  size() { return this.heap.length; }

  // ── Static Helpers ──────────────────────────────────────────────────────────

  /**
   * Returns appointments sorted from highest → lowest priority using heap sort.
   * O(n log n) — correct Max-Heap implementation, NOT a simple .sort() wrapper.
   */
  static sortByPriority(appointments) {
    const heap = new MaxHeap();
    appointments.forEach(a => heap.insert(a));
    const sorted = [];
    while (heap.size() > 0) sorted.push(heap.extractMax());
    return sorted;
  }

  static calculatePriority(appointment) {
    let score = 0;

    if (appointment.isEmergency) score += 100;

    const keywords = appointment.emergencyKeywords || [];
    for (const kw of keywords) {
      if (HIGH_SEVERITY.includes(kw))        score += 50;
      else if (MEDIUM_SEVERITY.includes(kw)) score += 30;
      else                                    score += 20;
    }

    if (appointment.preferredDate) {
      const daysAway = (new Date(appointment.preferredDate) - Date.now()) / 86_400_000;
      score += Math.max(0, 20 - Math.max(0, daysAway)); // 20 pts if today, 0 if ≥20 days away
    }

    return Math.round(score);
  }

  static getPriorityLabel(score) {
    if (score >= 150) return { label: 'CRITICAL', color: 'danger' };
    if (score >= 100) return { label: 'HIGH',     color: 'warning' };
    if (score >= 50)  return { label: 'MEDIUM',   color: 'info' };
    return                   { label: 'NORMAL',   color: 'secondary' };
  }

  // ── Private Heap Operations ─────────────────────────────────────────────────

  _bubbleUp(i) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[parent].priority >= this.heap[i].priority) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  _sinkDown(i) {
    const n = this.heap.length;
    while (true) {
      let largest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.heap[l].priority > this.heap[largest].priority) largest = l;
      if (r < n && this.heap[r].priority > this.heap[largest].priority) largest = r;
      if (largest === i) break;
      [this.heap[largest], this.heap[i]] = [this.heap[i], this.heap[largest]];
      i = largest;
    }
  }
}

export default MaxHeap;