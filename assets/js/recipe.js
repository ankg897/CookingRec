"use strict";

/**Import**/
import { fetchDataWithAndLogic, fetchAllRecipes } from "./api.js";
import { $skeletonCard } from "./global.js";

/**Utility Functions**/
const addEventOnElements = function (elements, eventType, callback) {
    for (const element of elements) {
        element.addEventListener(eventType, callback);
    }
}

/**Accordion**/
const $accordions = document.querySelectorAll("[data-accordion]");

const initAccordion = function ($element) {
    const $button = $element.querySelector("[data-accordion-btn]");
    let isExpanded = false;

    $button.addEventListener("click", function () {
        isExpanded = isExpanded ? false : true;
        this.setAttribute("aria-expanded", isExpanded);
    });
}

for (const $accordion of $accordions) {
    initAccordion($accordion);
}

/**Filter bar toggle**/
const $filterBar = document.querySelector("[data-filter-bar]");
const $filterTogglers = document.querySelectorAll("[data-filter-toggler]");
const $overlay = document.querySelector("[data-overlay]");

addEventOnElements($filterTogglers, "click", function () {
    $filterBar.classList.toggle("active");
    $overlay.classList.toggle("active");
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = bodyOverflow === "hidden" ? "visible" : "hidden";
});

/**Filter submit and clear**/
const $filterSubmit = document.querySelector("[data-filter-submit]");
const $filterClear = document.querySelector("[data-filter-clear]");
const $filterSearch = $filterBar.querySelector("input[type='search']");

// Get ALL checkboxes and radio buttons from the filter bar
const getAllFilterInputs = () => {
    return $filterBar.querySelectorAll('input[type="checkbox"], input[type="radio"]');
};

// Get specifically cuisine checkboxes
const getCuisineCheckboxes = () => {
    return $filterBar.querySelectorAll('input[type="checkbox"][data-filter="area"]');
};

$filterSubmit.addEventListener("click", function () {
    const queries = [];

    // Search query
    if ($filterSearch.value) queries.push(["q", $filterSearch.value]);
    
    // Category (radio - only one can be selected)
    const selectedCategory = $filterBar.querySelector('input[type="radio"][name="category"]:checked');
    if (selectedCategory) {
        queries.push(["c", selectedCategory.value]);
    }
    
    // Areas/Cuisines (checkboxes with data-filter="area" - multiple can be selected)
    const cuisineCheckboxes = getCuisineCheckboxes();
    cuisineCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            queries.push(["a", checkbox.value]);
        }
    });
    
    console.log("Submitting filters:", queries);
    window.location = queries.length ? `?${queries.map(q => `${q[0]}=${encodeURIComponent(q[1])}`).join("&")}` : "/recipes.html";
});

$filterSearch.addEventListener("keydown", e => {
    if (e.key === "Enter") $filterSubmit.click();
});

$filterClear.addEventListener("click", function () {
    // Clear all selections
    const allInputs = getAllFilterInputs();
    allInputs.forEach(input => input.checked = false);
    $filterSearch.value = "";
});

// Parse URL parameters
const urlParams = new URLSearchParams(window.location.search);
const queries = Array.from(urlParams.entries());

const $filterCount = document.querySelector("[data-filter-count]"); 

// Calculate filter count (1 for category + number of cuisines)
const calculateFilterCount = () => {
    let count = 0;
    
    // Count category
    const selectedCategory = $filterBar.querySelector('input[type="radio"][name="category"]:checked');
    if (selectedCategory) count++;
    
    // Count cuisines
    const cuisineCheckboxes = getCuisineCheckboxes();
    cuisineCheckboxes.forEach(checkbox => {
        if (checkbox.checked) count++;
    });
    
    // Count search
    if ($filterSearch.value) count++;
    
    return count;
};

// Update filter count display
const updateFilterCount = () => {
    const count = calculateFilterCount();
    if (count > 0) {
        $filterCount.style.display = "block";
        $filterCount.innerHTML = count;
    } else {
        $filterCount.style.display = "none";
    }
};

if (queries.length > 0) {
    $filterCount.style.display = "block";
    $filterCount.innerHTML = queries.length;
} else {
    $filterCount.style.display = "none";
}

// Set filter values from URL
const categoryValues = queries.filter(q => q[0] === 'c').map(q => q[1]);
const areaValues = queries.filter(q => q[0] === 'a').map(q => q[1]);
const searchValue = queries.find(q => q[0] === 'q');

// Set search value
if (searchValue) {
    $filterSearch.value = decodeURIComponent(searchValue[1]);
}

// Set category (radio - only first one)
if (categoryValues.length > 0) {
    const firstCategory = decodeURIComponent(categoryValues[0]);
    const categoryRadio = $filterBar.querySelector(`input[type="radio"][value="${firstCategory}"]`);
    if (categoryRadio) {
        categoryRadio.checked = true;
    }
}

// Set areas/cuisines (checkboxes - multiple)
areaValues.forEach(areaValue => {
    const decodedValue = decodeURIComponent(areaValue);
    const cuisineCheckbox = $filterBar.querySelector(`input[type="checkbox"][value="${decodedValue}"]`);
    if (cuisineCheckbox) {
        cuisineCheckbox.checked = true;
    }
});

// Update filter count after setting values from URL
setTimeout(updateFilterCount, 100);

const $filterBtn = document.querySelector("[data-filter-btn]");

window.addEventListener("scroll", e => {
    $filterBtn.classList[window.scrollY >= 120 ? "add" : "remove"]("active");
});

/**Request recipes from MealDB */
const $gridList = document.querySelector("[data-grid-list]");
const $loadMore = document.querySelector("[data-load-more]");

// Show loading state immediately
$gridList.innerHTML = $skeletonCard.repeat(12);

// Modified renderRecipe function for MealDB
const renderRecipe = data => {
    console.log("Rendering recipes with data:", data);
    
    // Clear loading state
    $gridList.innerHTML = "";
    
    if (!data.hits || data.hits.length === 0) {
        $gridList.innerHTML = `
            <div style="text-align: center; padding: 40px; grid-column: 1 / -1;">
                <p class="body-medium info-text">No recipes found matching your filters</p>
                <p class="body-small" style="margin-top: 10px; opacity: 0.7;">
                    Try selecting different combinations
                </p>
                <a href="/recipes.html" class="btn btn-primary" style="margin-top: 20px;">Browse All Recipes</a>
            </div>
        `;
        return;
    }

    data.hits.forEach((item, index) => {
        const {
            recipe: {
                uri,
                label: title,
                image,
                category,
                area
            }
        } = item;

        // Extract recipe ID from uri (format: "recipe_52772")
        const recipeId = uri.replace('recipe_', '');
        const isSaved = window.localStorage.getItem(`cookingfrenzy-recipe${recipeId}`);

        const $card = document.createElement("div");
        $card.className = "card";
        $card.style.animationDelay = `${100 * index}ms`;
        
        $card.innerHTML = `
            <figure class="card-media img-holder">
                <img src="${image}" width="195" height="195" loading="lazy" alt="${title}" class="img-cover">
            </figure>
            <div class="card-body">
                <div class="card-header">
                    <h3 class="title-small">
                        <a href="./detail.html?recipe=${recipeId}" class="card-link">${title || "Untitled"}</a>
                    </h3>
                    <button class="save-btn ${isSaved ? "saved" : "removed"}" 
                            aria-label="${isSaved ? 'Click to unsave recipe' : 'Click to save recipe'}" 
                            onclick="window.saveRecipe(this, '${recipeId}')">
                        <span class="material-symbols-outlined bookmark-add" aria-hidden="true">bookmark_add</span>
                        <span class="material-symbols-outlined bookmark" aria-hidden="true">bookmark</span>   
                    </button>
                </div>
                <div class="meta-wrapper">
                    ${category ? `
                        <div class="meta-item">
                            <span class="material-symbols-outlined" aria-hidden="true">category</span>
                            <span class="label-medium">${category}</span>
                        </div>
                    ` : ''}
                    ${area ? `
                        <div class="meta-item">
                            <span class="material-symbols-outlined" aria-hidden="true">place</span>
                            <span class="label-medium">${area}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        $gridList.appendChild($card);
    });

    // Update page title based on filters
    updatePageTitle(queries);
}

// Function to update page title based on active filters
const updatePageTitle = (queries) => {
    const $pageHeader = document.querySelector("h2"); // Changed to h2 for your HTML structure
    if (!$pageHeader) return;

    const categories = queries.filter(q => q[0] === 'c').map(q => q[1]);
    const areas = queries.filter(q => q[0] === 'a').map(q => q[1]);
    const search = queries.find(q => q[0] === 'q');

    let title = "Random Recipes";

    if (search) {
        title = `Search: "${search[1]}"`;
        if (categories.length > 0 || areas.length > 0) {
            title += ` + Filters`;
        }
    } else if (categories.length > 0 && areas.length > 0) {
        title = `${categories[0]} & ${areas.join(' + ')} Recipes`;
    } else if (categories.length > 0) {
        title = `${categories[0]} Recipes`;
    } else if (areas.length > 1) {
        title = `${areas.join(' + ')} Cuisine`;
    } else if (areas.length === 1) {
        title = `${areas[0]} Recipes`;
    }

    $pageHeader.textContent = title;
}

// Load recipes based on URL parameters or show all recipes
console.log("Initial queries:", queries);

// Show appropriate loading message
if (queries.length > 0) {
    const $loadingMessage = document.createElement("div");
    $loadingMessage.className = "loading-message";
    $loadingMessage.innerHTML = `
        <div style="text-align: center; padding: 40px; grid-column: 1 / -1;">
            <div class="loading-spinner" style="margin-bottom: 20px;">
                <span class="material-symbols-outlined" style="font-size: 48px; color: var(--primary-container);">filter_alt</span>
            </div>
            <p class="body-medium">Finding recipes matching your filters...</p>
        </div>
    `;
    $gridList.innerHTML = "";
    $gridList.appendChild($loadingMessage);

    // If there are filters, use the new AND logic function
    console.log("Fetching with AND logic...");
    fetchDataWithAndLogic(queries, data => {
        console.log("Filtered data received:", data);
        renderRecipe(data);
    });
} else {
    // Random loading messages for better UX
    const loadingMessages = [
        "Discovering delicious recipes...",
        "Finding culinary treasures...",
        "Loading amazing dishes...",
        "Preparing your recipe collection...",
        "Gathering cooking inspiration...",
        "Searching for tasty meals..."
    ];

    const randomMessage = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];

    const $loadingMessage = document.createElement("div");
    $loadingMessage.className = "loading-message";
    $loadingMessage.innerHTML = `
        <div style="text-align: center; padding: 40px; grid-column: 1 / -1;">
            <div class="loading-spinner" style="margin-bottom: 20px;">
                <span class="material-symbols-outlined" style="font-size: 48px; color: var(--primary-container);">restaurant</span>
            </div>
            <p class="body-medium">${randomMessage}</p>
        </div>
    `;
    $gridList.innerHTML = "";
    $gridList.appendChild($loadingMessage);

    // If no filters, fetch truly random recipes
    console.log("Fetching random recipes...");
    fetchAllRecipes(data => {
        console.log("Random recipes received:", data);
        renderRecipe(data);
    });
}

// Global saveRecipe function
window.saveRecipe = function(button, recipeId) {
    const isSaved = window.localStorage.getItem(`cookingfrenzy-recipe${recipeId}`);
    
    if (isSaved) {
        window.localStorage.removeItem(`cookingfrenzy-recipe${recipeId}`);
        button.classList.remove("saved");
        button.classList.add("removed");
        button.setAttribute("aria-label", "Click to save recipe");
    } else {
        // Get the recipe data from the current card
        const card = button.closest('.card');
        const title = card.querySelector('.card-link').textContent;
        const image = card.querySelector('img').src;
        
        // Create recipe data object
        const recipeData = {
            id: recipeId,
            title: title,
            image: image
        };
        
        // Store the complete recipe data
        window.localStorage.setItem(`cookingfrenzy-recipe${recipeId}`, JSON.stringify(recipeData));
        button.classList.remove("removed");
        button.classList.add("saved");
        button.setAttribute("aria-label", "Click to unsave recipe");
    }
}

// Remove the infinite scroll code since TheMealDB doesn't support pagination
$loadMore.style.display = "none";

// Add some CSS for better loading states
const style = document.createElement('style');
style.textContent = `
    .loading-message {
        grid-column: 1 / -1;
        text-align: center;
        padding: 40px;
    }
    
    .card {
        opacity: 0;
        animation: fadeInUp 0.5s ease forwards;
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .loading-spinner {
        animation: pulse 1.5s ease-in-out infinite;
    }
    
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
    }
    
    .meta-wrapper {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
    }
    
    .meta-item {
        display: flex;
        align-items: center;
        gap: 4px;
    }
    
    .meta-item .material-symbols-outlined {
        font-size: 16px;
        opacity: 0.7;
    }
`;
document.head.appendChild(style);