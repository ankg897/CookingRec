"use strict";

/** Import */
import { fetchData } from "./api.js";
import { $skeletonCard, cardQueries } from "./global.js";

const $searchField = document.querySelector("[data-search-field]");
const $searchBtn = document.querySelector("[data-search-btn]");

/** Search button click event */
$searchBtn.addEventListener("click", function() {
    if ($searchField.value) window.location = `/recipes.html?q=${$searchField.value}`;
});

/** Search field enter key event */
$searchField.addEventListener("keydown", e => {
    if (e.key === "Enter" ) $searchBtn.click();
});

const $tabBtns = document.querySelectorAll("[data-tab-btn]");
const $tabPanels = document.querySelectorAll("[data-tab-panel]");

let [$lastActiveTabPanel] = $tabPanels;
let [$lastActiveTabBtn] = $tabBtns;

/** Tab button click event */
window.addEventOnElements($tabBtns, "click", function() {
    $lastActiveTabPanel.setAttribute("hidden", "");
    $lastActiveTabBtn.setAttribute("aria-selected", "false");
    $lastActiveTabBtn.setAttribute("tabindex", "-1");

    const $currentTabPanel = document.querySelector(`#${this.getAttribute("aria-controls")}`);
    $currentTabPanel.removeAttribute("hidden");
    this.setAttribute("aria-selected", "true");
    this.setAttribute("tabindex", "0");

    $lastActiveTabPanel = $currentTabPanel;
    $lastActiveTabBtn = this;
    addTabContent(this, $currentTabPanel);
});

/* API work for tab panels */
const addTabContent = ($currentTabBtn, $currentTabPanel) => {
    const $gridList = document.createElement("div")
    $gridList.classList.add("grid-list");

    $currentTabPanel.innerHTML = `
      <div class="grid-list">
        ${$skeletonCard.repeat(12)}
      </div>
    `;
  
    // Use the exact text from the button (already in English)
    const category = $currentTabBtn.textContent.trim();
    
    fetchData([['c', category]], function(data) {
        $currentTabPanel.innerHTML = "";
        $gridList.innerHTML = "";
        
        if (data.hits && data.hits.length > 0) {
            for (let i = 0; i < Math.min(15, data.hits.length); i++) {
                const {
                    recipe: {
                        image,
                        label: title,
                        totalTime: cookingTime,
                        uri
                    }
                } = data.hits[i];

                const recipeId = uri.slice(uri.lastIndexOf("_") + 1); 
                const isSaved = window.localStorage.getItem(`cookingfrenzy-recipe${recipeId}`);

                const $card = document.createElement("div");
                $card.classList.add("card");
                $card.style.animationDelay = `${100 * i}ms`;

                $card.innerHTML = `
                    <figure class="card-media img-holder">
                        <img src="${image}" width="195" height="195" loading="lazy" alt="${title}" class="img-cover">
                    </figure>
                    <div class="card-body">
                        <div class="card-header">
                            <h3 class="title-small">
                                <a href="./detail.html?recipe=${recipeId}" class="card-link">${title ?? "Untitled"}</a>
                            </h3>
                            <button class="save-btn ${isSaved ? "saved" : "removed"}" 
                                    aria-label="${isSaved ? 'Click to unsave recipe' : 'Click to save recipe'}" 
                                    onclick="window.saveRecipe(this, '${recipeId}')">
                                <span class="material-symbols-outlined bookmark-add" aria-hidden="true">bookmark_add</span>
                                <span class="material-symbols-outlined bookmark" aria-hidden="true">bookmark</span>   
                            </button>
                        </div>
                        <div class="meta-wrapper">
                            ${cookingTime ? `
                                <div class="meta-item">
                                    <span class="material-symbols-outlined" aria-hidden="true">schedule</span>
                                    <span class="label-medium">${cookingTime} minutes</span>
                                </div>
                            ` : '<div></div>'}
                            <div></div> <!-- Spacer for flex layout -->
                        </div>
                    </div>
                `;

                $gridList.appendChild($card);
            }
            
            $currentTabPanel.appendChild($gridList);
            
            // Add "See more" button
            const seeMoreBtn = document.createElement("a");
            seeMoreBtn.href = `./recipes.html?c=${encodeURIComponent(category)}`;
            seeMoreBtn.className = "btn btn-primary label-large has-state";
            seeMoreBtn.textContent = "See more";
            seeMoreBtn.style.marginTop = "20px";
            seeMoreBtn.style.display = "block";
            seeMoreBtn.style.width = "fit-content";
            seeMoreBtn.style.marginLeft = "auto";
            seeMoreBtn.style.marginRight = "auto";
            $currentTabPanel.appendChild(seeMoreBtn);
            
        } else {
            $currentTabPanel.innerHTML = '<p class="body-large" style="text-align: center; padding: 40px;">No recipes found for this category.</p>';
        }
    });
}

// Initialize the first tab
addTabContent($lastActiveTabBtn, $lastActiveTabPanel);

/** Fetch data from slider */
const cuisineType = ["American", "Italian", "Mexican", "French", "Indian"];
const $sliderSections = document.querySelectorAll("[data-slider-section]");

for (const [index, $sliderSection] of $sliderSections.entries()) {
    if (index >= cuisineType.length) break;
    
    const currentCuisine = cuisineType[index];
    
    $sliderSection.innerHTML = `
    <div class="container">
        <h2 class="section-title headline-small" id="slider-label-${index + 1}">
            Latest ${currentCuisine} Recipes
        </h2>
        <div class="slider-container">
            <button class="slider-btn slider-btn-prev" aria-label="Previous recipes">
                <span class="material-symbols-outlined">chevron_left</span>
            </button>
            
            <div class="Slider">
                <ul class="slider-wrapper" data-slider-wrapper>
                    ${`<li class="slider-item">${$skeletonCard}</li>`.repeat(6)}
                </ul>
            </div>
            
            <button class="slider-btn slider-btn-next" aria-label="Next recipes">
                <span class="material-symbols-outlined">chevron_right</span>
            </button>
        </div>
    </div>
    `;

    const $sliderWrapper = $sliderSection.querySelector("[data-slider-wrapper]");
    const $prevBtn = $sliderSection.querySelector(".slider-btn-prev");
    const $nextBtn = $sliderSection.querySelector(".slider-btn-next");
    const $slider = $sliderSection.querySelector(".Slider");

    // Add slider navigation functionality
    const updateSliderButtons = () => {
        const scrollLeft = $slider.scrollLeft;
        const scrollWidth = $slider.scrollWidth;
        const clientWidth = $slider.clientWidth;
        
        $prevBtn.disabled = scrollLeft <= 0;
        $nextBtn.disabled = scrollLeft + clientWidth >= scrollWidth - 10;
    };

    $prevBtn.addEventListener('click', () => {
        $slider.scrollBy({ left: -300, behavior: 'smooth' });
    });

    $nextBtn.addEventListener('click', () => {
        $slider.scrollBy({ left: 300, behavior: 'smooth' });
    });

    $slider.addEventListener('scroll', updateSliderButtons);

    // Use 'a' parameter for area filtering in MealDB
    fetchData([["a", currentCuisine]], function(data) {
        if (!data || !data.hits || data.hits.length === 0) {
            $sliderWrapper.innerHTML = '<p class="body-large">No recipes found for this cuisine.</p>';
            $prevBtn.style.display = 'none';
            $nextBtn.style.display = 'none';
            return;
        }
        
        $sliderWrapper.innerHTML = "";
        
        // Show maximum 6 items in slider
        const itemsToShow = data.hits.slice(0, 6);
        
        itemsToShow.forEach(item => {
            const {
                recipe: {
                    image,
                    label: title,
                    totalTime: cookingTime,
                    uri
                }
            } = item;

            const recipeId = uri.slice(uri.lastIndexOf("_") + 1);
            const isSaved = window.localStorage.getItem(`cookingfrenzy-recipe${recipeId}`);

            const $sliderItem = document.createElement("li");
            $sliderItem.className = "slider-item";
            
            $sliderItem.innerHTML = `
                <div class="card">
                    <figure class="card-media img-holder">
                        <img src="${image}" width="195" height="195" loading="lazy" alt="${title}" class="img-cover">
                    </figure>
                    <div class="card-body">
                        <div class="card-header">
                            <h3 class="title-small">
                                <a href="./detail.html?recipe=${recipeId}" class="card-link">${title ?? "Untitled"}</a>
                            </h3>
                            <button class="save-btn ${isSaved ? "saved" : "removed"}" 
                                    aria-label="${isSaved ? 'Click to unsave recipe' : 'Click to save recipe'}" 
                                    onclick="window.saveRecipe(this, '${recipeId}')">
                                <span class="material-symbols-outlined bookmark-add" aria-hidden="true">bookmark_add</span>
                                <span class="material-symbols-outlined bookmark" aria-hidden="true">bookmark</span>   
                            </button>
                        </div>
                        <div class="meta-wrapper">
                            ${cookingTime ? `
                                <div class="meta-item">
                                    <span class="material-symbols-outlined" aria-hidden="true">schedule</span>
                                    <span class="label-medium">${cookingTime} minutes</span>
                                </div>
                            ` : '<div></div>'}
                            <div></div>
                        </div>
                    </div>
                </div>
            `;

            $sliderWrapper.appendChild($sliderItem);
        });

        // Add "See more" item if we have recipes
        if (data.hits.length > 0) {
            const $seeMoreItem = document.createElement("li");
            $seeMoreItem.className = "slider-item";
            $seeMoreItem.setAttribute("data-slider-item", "");
            $seeMoreItem.innerHTML = `
                <a href="./recipes.html?a=${currentCuisine.toLowerCase()}" class="load-more-card has-state">
                    <span class="label-large">See more ${currentCuisine} recipes</span>
                    <span class="material-symbols-outlined" aria-hidden="true">navigate_next</span>
                </a>
            `;
            $sliderWrapper.appendChild($seeMoreItem);
        }

        // Update button states after content loads
        setTimeout(updateSliderButtons, 100);
    });
}