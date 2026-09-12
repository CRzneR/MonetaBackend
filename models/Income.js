/*
 * Moneta – Einnahmen
 *
 * Die Auswahl des Datums bestimmt automatisch:
 *
 * 15.09.2026
 *     ↓
 * month = "Sep"
 * year  = 2026
 *
 * Bei Gehalt wird derselbe Monat aktualisiert,
 * statt einen zweiten Gehaltseintrag anzulegen.
 */

import { API_BASE } from "../config.js";

const SELECTORS = {
  form: "#incomeForm",
  source: "#incomeSource",
  amount: "#incomeAmount",
  category: "#incomeCategory",
  date: "#incomeDate",
  message: "#incomeMessage",

  overlay: "#incomeOverlay",
  addButton: "#addIncomeBtn",
  saveButton: "#saveIncomeBtn",
  cancelButton: "#cancelIncomeBtn",

  monthCarousel: "#monthCarousel",
  monthPrev: "#monthPrev",
  monthNext: "#monthNext",

  salaryList: "#gehaltList",
  sideList: "#sideList",

  salaryTotal: "#gehaltTotalLabel",
  sideTotal: "#sideTotalLabel",

  statTotal: "#statTotalValue",
  statSalary: "#statGehaltValue",
  statSide: "#statSideValue",

  yearSelect: "#yearSelect",
  earningsChart: "#earningsChart",
};

const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

const MONTH_NAMES = {
  Jan: "Januar",
  Feb: "Februar",
  Mär: "März",
  Apr: "April",
  Mai: "Mai",
  Jun: "Juni",
  Jul: "Juli",
  Aug: "August",
  Sep: "September",
  Okt: "Oktober",
  Nov: "November",
  Dez: "Dezember",
};

let incomes = [];
let selectedMonth = MONTHS[new Date().getMonth()];
let selectedYear = new Date().getFullYear();

let earningsChart = null;

/* -----------------------------------------
 * Hilfsfunktionen
 * ----------------------------------------- */

function $(selector) {
  return document.querySelector(selector);
}

function getToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token") || "";
}

function euro(value) {
  return `${Number(value || 0).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}

function getMonthFromDate(dateString) {
  if (!dateString) return selectedMonth;

  const date = new Date(`${dateString}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return selectedMonth;
  }

  return MONTHS[date.getMonth()];
}

function getYearFromDate(dateString) {
  if (!dateString) return selectedYear;

  const date = new Date(`${dateString}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return selectedYear;
  }

  return date.getFullYear();
}

function getDateForMonth(month, year) {
  const index = MONTHS.indexOf(month);

  if (index === -1) {
    return `${year}-01-01`;
  }

  return `${year}-${String(index + 1).padStart(2, "0")}-01`;
}

/**
 * Hält das #incomeDate-Feld immer synchron mit
 * selectedMonth/selectedYear (auch bei den Pfeil-Buttons).
 */
function syncDateFieldToSelectedMonth() {
  const date = $(SELECTORS.date);

  if (date) {
    date.value = getDateForMonth(selectedMonth, selectedYear);
  }
}

/* -----------------------------------------
 * API
 * ----------------------------------------- */

async function api(url, options = {}) {
  const token = getToken();

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,

    headers: {
      "Content-Type": "application/json",

      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),

      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Serverfehler");
  }

  return data;
}

/* -----------------------------------------
 * Meldungen
 * ----------------------------------------- */

function showMessage(text, success = false) {
  const element = $(SELECTORS.message);

  if (!element) return;

  element.textContent = text;

  element.className = success
    ? "text-sm text-emerald-600 min-h-[20px]"
    : "text-sm text-red-600 min-h-[20px]";
}

/* -----------------------------------------
 * Overlay
 * ----------------------------------------- */

function openIncomeOverlay() {
  const overlay = $(SELECTORS.overlay);

  if (!overlay) return;

  overlay.classList.remove("hidden");

  const date = $(SELECTORS.date);

  if (date && !date.value) {
    syncDateFieldToSelectedMonth();
  }

  showMessage("");
}

function closeIncomeOverlay() {
  const overlay = $(SELECTORS.overlay);

  if (!overlay) return;

  overlay.classList.add("hidden");
}

/* -----------------------------------------
 * Daten laden
 * ----------------------------------------- */

async function loadSelectedMonth() {
  const data = await api(
    `/api/income?month=${encodeURIComponent(selectedMonth)}&year=${selectedYear}`,
  );

  incomes = Array.isArray(data) ? data : [];

  renderCurrentMonth();
}

/* -----------------------------------------
 * Monatsdaten darstellen
 * ----------------------------------------- */

function renderCurrentMonth() {
  const monthIncomes = incomes.filter(
    (income) => income.month === selectedMonth && Number(income.year) === Number(selectedYear),
  );

  const salaries = monthIncomes.filter((income) => income.category === "Gehalt");

  const sideIncomes = monthIncomes.filter((income) => income.category === "Nebeneinkünfte");

  const salaryTotal = salaries.reduce((sum, income) => sum + Number(income.amount || 0), 0);

  const sideTotal = sideIncomes.reduce((sum, income) => sum + Number(income.amount || 0), 0);

  const total = salaryTotal + sideTotal;

  const statTotal = $(SELECTORS.statTotal);
  const statSalary = $(SELECTORS.statSalary);
  const statSide = $(SELECTORS.statSide);

  if (statTotal) {
    statTotal.textContent = euro(total);
  }

  if (statSalary) {
    statSalary.textContent = euro(salaryTotal);
  }

  if (statSide) {
    statSide.textContent = euro(sideTotal);
  }

  const salaryLabel = $(SELECTORS.salaryTotal);
  const sideLabel = $(SELECTORS.sideTotal);

  if (salaryLabel) {
    salaryLabel.textContent = euro(salaryTotal);
  }

  if (sideLabel) {
    sideLabel.textContent = euro(sideTotal);
  }

  renderIncomeList($(SELECTORS.salaryList), salaries);

  renderIncomeList($(SELECTORS.sideList), sideIncomes);

  renderMonthCarousel();

  window.currentMonth = selectedMonth;
  window.currentYear = selectedYear;

  window.dispatchEvent(
    new CustomEvent("moneta:monthChanged", {
      detail: {
        month: selectedMonth,
        year: selectedYear,
      },
    }),
  );
}

/* -----------------------------------------
 * Einnahmen-Liste
 * ----------------------------------------- */

function renderIncomeList(container, list) {
  if (!container) return;

  container.innerHTML = "";

  if (!list.length) {
    const empty = document.createElement("div");

    empty.className = "rounded-xl bg-gray-100 p-4 text-sm text-gray-500";

    empty.textContent = `Keine Einnahmen für ${MONTH_NAMES[selectedMonth]} ${selectedYear}.`;

    container.appendChild(empty);

    return;
  }

  for (const income of list) {
    const row = document.createElement("div");

    row.className =
      "flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-xl p-4";

    const left = document.createElement("div");

    const source = document.createElement("p");

    source.className = "font-medium text-gray-900";

    source.textContent = income.source || "Einnahme";

    const category = document.createElement("p");

    category.className = "text-xs text-gray-500 mt-1";

    category.textContent = `${income.category || ""} · ${MONTH_NAMES[income.month] || income.month} ${income.year}`;

    left.appendChild(source);
    left.appendChild(category);

    const right = document.createElement("div");

    right.className = "flex items-center gap-3";

    const amount = document.createElement("p");

    amount.className = "font-semibold text-emerald-600";

    amount.textContent = euro(income.amount);

    const deleteButton = document.createElement("button");

    deleteButton.type = "button";

    deleteButton.className =
      "w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50";

    deleteButton.innerHTML = '<i data-lucide="trash-2" class="w-4 h-4"></i>';

    deleteButton.addEventListener("click", () => {
      deleteIncome(income._id);
    });

    right.appendChild(amount);
    right.appendChild(deleteButton);

    row.appendChild(left);
    row.appendChild(right);

    container.appendChild(row);
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/* -----------------------------------------
 * Monat-Carousel
 * ----------------------------------------- */

function renderMonthCarousel() {
  const carousel = $(SELECTORS.monthCarousel);

  if (!carousel) return;

  carousel.innerHTML = "";

  MONTHS.forEach((month) => {
    const button = document.createElement("button");

    button.type = "button";

    const active = month === selectedMonth;

    button.className = active
      ? "shrink-0 px-4 py-2 rounded-full bg-emerald-500 text-white text-sm font-medium"
      : "shrink-0 px-4 py-2 rounded-full bg-white border border-gray-200 text-gray-600 text-sm";

    button.textContent = MONTH_NAMES[month];

    button.addEventListener("click", () => {
      selectMonth(month);
    });

    carousel.appendChild(button);
  });
}

/* -----------------------------------------
 * Monat auswählen
 * ----------------------------------------- */

async function selectMonth(month) {
  selectedMonth = month;

  window.currentMonth = selectedMonth;
  window.currentYear = selectedYear;

  syncDateFieldToSelectedMonth();

  await loadSelectedMonth();
}

/* -----------------------------------------
 * Monat zurück / vor
 * ----------------------------------------- */

async function previousMonth() {
  let index = MONTHS.indexOf(selectedMonth);

  index--;

  if (index < 0) {
    index = MONTHS.length - 1;
    selectedYear--;
  }

  selectedMonth = MONTHS[index];

  syncDateFieldToSelectedMonth();

  await loadSelectedMonth();
}

async function nextMonth() {
  let index = MONTHS.indexOf(selectedMonth);

  index++;

  if (index >= MONTHS.length) {
    index = 0;
    selectedYear++;
  }

  selectedMonth = MONTHS[index];

  syncDateFieldToSelectedMonth();

  await loadSelectedMonth();
}

/* -----------------------------------------
 * Einnahme speichern
 * ----------------------------------------- */

async function saveIncome() {
  const source = $(SELECTORS.source)?.value.trim() || "Monatsgehalt";

  const rawAmount = $(SELECTORS.amount)?.value || "";

  const amount = Number(
    String(rawAmount)
      .replace(",", ".")
      .replace(/[^\d.-]/g, ""),
  );

  const category = $(SELECTORS.category)?.value;

  const date = $(SELECTORS.date)?.value;

  if (!category) {
    showMessage("Bitte eine Kategorie auswählen.");

    return;
  }

  if (!Number.isFinite(amount) || amount < 0) {
    showMessage("Bitte einen gültigen Betrag eingeben.");

    return;
  }

  if (!date) {
    showMessage("Bitte ein Datum auswählen.");

    return;
  }

  const month = getMonthFromDate(date);
  const year = getYearFromDate(date);

  try {
    await api("/api/income", {
      method: "POST",

      body: JSON.stringify({
        source,
        amount,
        category,

        month,
        year,
      }),
    });

    selectedMonth = month;
    selectedYear = year;

    window.currentMonth = month;
    window.currentYear = year;

    showMessage(
      `${category} von ${euro(amount)} für ${MONTH_NAMES[month]} ${year} gespeichert.`,
      true,
    );

    await loadSelectedMonth();

    $(SELECTORS.source).value = category === "Gehalt" ? "Monatsgehalt" : "";

    $(SELECTORS.amount).value = "";

    setTimeout(() => {
      closeIncomeOverlay();
    }, 500);
  } catch (error) {
    console.error("Fehler beim Speichern:", error);

    showMessage(error.message);
  }
}

/* -----------------------------------------
 * Einnahme löschen
 * ----------------------------------------- */

async function deleteIncome(id) {
  if (!id) return;

  const confirmed = window.confirm("Möchtest du diese Einnahme wirklich löschen?");

  if (!confirmed) return;

  try {
    await api(`/api/income/${id}`, {
      method: "DELETE",
    });

    await loadSelectedMonth();
  } catch (error) {
    console.error("Fehler beim Löschen:", error);
  }
}

/* -----------------------------------------
 * Jahresübersicht
 * ----------------------------------------- */

async function loadYear(year) {
  try {
    const data = await api(`/api/income?year=${year}`);

    const yearIncomes = Array.isArray(data) ? data : [];

    renderYearChart(yearIncomes, year);
  } catch (error) {
    console.error("Fehler beim Laden der Jahresübersicht:", error);
  }
}

function renderYearChart(data, year) {
  const canvas = $(SELECTORS.earningsChart);

  if (!canvas || !window.Chart) return;

  const values = MONTHS.map((month) => {
    return data
      .filter((income) => income.month === month && Number(income.year) === Number(year))
      .reduce((sum, income) => sum + Number(income.amount || 0), 0);
  });

  if (earningsChart) {
    earningsChart.destroy();
  }

  earningsChart = new Chart(canvas, {
    type: "bar",

    data: {
      labels: MONTHS.map((month) => MONTH_NAMES[month]),

      datasets: [
        {
          label: "Einnahmen",
          data: values,
          borderWidth: 1,
        },
      ],
    },

    options: {
      responsive: true,

      plugins: {
        legend: {
          display: false,
        },
      },

      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

/* -----------------------------------------
 * Jahr-Auswahl
 * ----------------------------------------- */

function initYearSelect() {
  const select = $(SELECTORS.yearSelect);

  if (!select) return;

  const currentYear = new Date().getFullYear();

  select.innerHTML = "";

  for (let year = currentYear - 2; year <= currentYear + 2; year++) {
    const option = document.createElement("option");

    option.value = year;
    option.textContent = year;

    if (year === currentYear) {
      option.selected = true;
    }

    select.appendChild(option);
  }

  select.addEventListener("change", () => {
    loadYear(Number(select.value));
  });

  loadYear(currentYear);
}

/* -----------------------------------------
 * Events
 * ----------------------------------------- */

function initEvents() {
  $(SELECTORS.addButton)?.addEventListener("click", openIncomeOverlay);

  $(SELECTORS.cancelButton)?.addEventListener("click", closeIncomeOverlay);

  $(SELECTORS.saveButton)?.addEventListener("click", saveIncome);

  $(SELECTORS.monthPrev)?.addEventListener("click", () => {
    previousMonth().catch(console.error);
  });

  $(SELECTORS.monthNext)?.addEventListener("click", () => {
    nextMonth().catch(console.error);
  });

  $(SELECTORS.category)?.addEventListener("change", () => {
    const category = $(SELECTORS.category).value;

    const date = $(SELECTORS.date);

    if (category === "Gehalt" && date) {
      date.value = getDateForMonth(selectedMonth, selectedYear);
    }
  });

  $(SELECTORS.overlay)?.addEventListener("click", (event) => {
    if (event.target === $(SELECTORS.overlay)) {
      closeIncomeOverlay();
    }
  });
}

/* -----------------------------------------
 * Initialisierung
 * ----------------------------------------- */

export async function initIncomePage() {
  window.currentMonth = selectedMonth;
  window.currentYear = selectedYear;

  initEvents();

  initYearSelect();

  renderMonthCarousel();

  const date = $(SELECTORS.date);

  if (date && !date.value) {
    syncDateFieldToSelectedMonth();
  }

  try {
    await loadSelectedMonth();
  } catch (error) {
    console.error("Fehler beim Laden der Einnahmen:", error);
  }
}
