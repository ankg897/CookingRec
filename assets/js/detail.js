"use strict";

import { fetchRecipeDetail } from "./api.js";
import { auth } from './firebaseauth.js';

const $detailContainer = document.querySelector("[data-detail-container]");

// Get recipe ID from URL
const urlParams = new URLSearchParams(window.location.search);
const recipeId = urlParams.get('recipe');

console.log("Detail page loaded, recipe ID:", recipeId);

if (!recipeId) {
    console.error("No recipe ID found in URL");
    $detailContainer.innerHTML = `
        <div class="error-state">
            <h2 class="display-small">Recipe Not Found</h2>
            <p class="body-medium">Please go back to the recipes page and try again.</p>
            <a href="./recipes.html" class="btn btn-primary">Back to Recipes</a>
        </div>
    `;
} else {
    console.log("Fetching recipe details for ID:", recipeId);
    
    fetchRecipeDetail(recipeId, data => {
        if (!data || !data.recipe) {
            console.error("No recipe data received");
            $detailContainer.innerHTML = `
                <div class="error-state">
                    <h2 class="display-small">Recipe Not Found</h2>
                    <p class="body-medium">The recipe you're looking for doesn't exist or couldn't be loaded.</p>
                    <a href="./recipes.html" class="btn btn-primary">Back to Recipes</a>
                </div>
            `;
            return;
        }

        console.log("Recipe data received:", data.recipe);
        
        const {
            label: title,
            image: bannerUrl,
            category,
            area,
            ingredients = [],
            instructions,
            youtube,
            source,
            tags = []
        } = data.recipe;

        document.title = `${title} ~ CookingFrenzy`;

        let tagElements = "";
        let ingredientItems = "";

        // Combine all tags - better tag processing for TheMealDB
        const allTags = processMealDBTags(category, area, tags);
        
        if (allTags.length > 0) {
            allTags.forEach(tag => {
                const filterType = getFilterTypeForTag(tag);
                
                tagElements += `
                    <a href="./recipes.html?${filterType}=${encodeURIComponent(tag.toLowerCase())}" 
                       class="filter-chip label-large has-state">
                        ${tag}
                    </a>
                `;
            });
        }

        // Create ingredient list
        if (ingredients.length > 0) {
            ingredients.forEach(ingredient => {
                if (ingredient.text && ingredient.text.trim() !== "") {
                    ingredientItems += `
                        <li class="ingr-item">${ingredient.text}</li>
                    `;
                }
            });
        } else {
            ingredientItems = `<li class="ingr-item">No ingredients listed</li>`;
        }

        // Render the recipe HTML
        $detailContainer.innerHTML = `
            <figure class="detail-banner img-holder">
                <img src="${bannerUrl}" alt="${title}" class="img-cover" 
                     onerror="this.src='./assets/images/recipe.jpg'">
            </figure>
            
            <div class="detail-content">
                <div class="title-wrapper">
                    <h1 class="display-small">${title || "Untitled Recipe"}</h1>
                    <button class="btn btn-secondary has-state has-icon removed" 
                            onclick="saveRecipe(this, '${recipeId}')"
                            aria-label="Save recipe">
                        <span class="material-symbols-outlined" aria-hidden="true">bookmark_add</span>
                        <span class="label-large">Save</span>
                    </button>
                </div>
                
                <div class="detail-author label-large">
                    <span class="span">Category:</span> ${category || "Unknown"} | 
                    <span class="span">Cuisine:</span> ${area || "Unknown"}
                </div>
                
                <div class="detail-stats">
                    <div class="stats-item">
                        <span class="display-medium">${ingredients.length}</span>
                        <span class="label-medium">Ingredients</span>
                    </div>
                    <div class="stats-item">
                        <span class="display-medium">${allTags.length}</span>
                        <span class="label-medium">Tags</span>
                    </div>
                </div>
                
                ${tagElements ? `
                    <div class="tag-list">
                        ${tagElements}
                    </div>
                ` : ""}
                
                <h2 class="title-medium ingr-title">
                    Ingredients
                </h2>
                
                <ul class="body-large ingr-list">
                    ${ingredientItems}
                </ul>
                
                ${instructions ? `
                    <div class="instructions-section">
                        <h2 class="title-medium">Instructions</h2>
                        <div class="instructions body-large">
                            ${formatInstructions(instructions)}
                        </div>
                    </div>
                ` : '<p class="body-medium">No instructions available.</p>'}
                
                ${youtube ? `
                    <div class="video-section">
                        <a href="${youtube}" target="_blank" class="btn btn-primary has-icon">
                            <span class="material-symbols-outlined" aria-hidden="true">play_circle</span>
                            <span>Watch Video Tutorial</span>
                        </a>
                    </div>
                ` : ""}
                
                ${source ? `
                    <div class="source-section">
                        <a href="${source}" target="_blank" class="btn btn-secondary">
                            View Original Source
                        </a>
                    </div>
                ` : ""}
            </div>    
        `;

        // Check saved state after rendering
        setTimeout(() => {
            checkSavedStateOnLoad(recipeId);
        }, 100);
    });
}

// Global save recipe function - UPDATED for Firestore
window.saveRecipe = async function(element, recipeId) {
    // Check if user is logged in
    if (!auth?.currentUser) {
        alert('Please log in to save recipes');
        return;
    }

    // Get recipe data
    const title = document.querySelector('h1.display-small')?.textContent || 'Unknown Recipe';
    const image = document.querySelector('.detail-banner img')?.src || './assets/images/recipe.jpg';
    const category = document.querySelector('.detail-author')?.textContent?.match(/Category:\s*([^|]+)/)?.[1]?.trim() || '';
    const area = document.querySelector('.detail-author')?.textContent?.match(/Cuisine:\s*([^|]+)/)?.[1]?.trim() || '';

    try {
        const isSaved = await window.isRecipeSavedInFirestore?.(recipeId);

        if (isSaved) {
            // Remove from saved
            const success = await window.removeRecipeFromFirestore?.(recipeId);
            
            if (success) {
                // Update button appearance
                const icon = element.querySelector('.material-symbols-outlined');
                const text = element.querySelector('.label-large');
                
                icon.textContent = 'bookmark_add';
                text.textContent = 'Save';
                element.setAttribute('aria-label', 'Save recipe');
                element.classList.remove('saved');
                element.classList.add('removed');
                
                showSnackbar('Recipe removed from saved recipes');
            }
        } else {
            // Save recipe
            const recipeData = {
                id: recipeId,
                title: title,
                image: image,
                category: category,
                area: area,
                savedAt: new Date().toISOString()
            };
            
            const success = await window.saveRecipeToFirestore?.(recipeData);
            
            if (success) {
                // Update button appearance
                const icon = element.querySelector('.material-symbols-outlined');
                const text = element.querySelector('.label-large');
                
                icon.textContent = 'bookmark';
                text.textContent = 'Saved';
                element.setAttribute('aria-label', 'Remove from saved recipes');
                element.classList.add('saved');
                element.classList.remove('removed');
                
                showSnackbar('Recipe saved successfully');
            }
        }
    } catch (error) {
        console.error("Error toggling save state:", error);
        alert('Error saving recipe. Please try again.');
    }
};

// Add this function to check saved state on page load
async function checkSavedStateOnLoad(recipeId) {
    if (!auth?.currentUser) {
        // User not logged in, show default save button
        const saveButton = document.querySelector('.btn-secondary.has-icon');
        if (saveButton) {
            saveButton.classList.remove('saved');
            saveButton.classList.add('removed');
            saveButton.querySelector('.material-symbols-outlined').textContent = 'bookmark_add';
            saveButton.querySelector('.label-large').textContent = 'Save';
            saveButton.setAttribute('aria-label', 'Save recipe');
        }
        return;
    }

    try {
        const isSaved = await window.isRecipeSavedInFirestore?.(recipeId);
        const saveButton = document.querySelector('.btn-secondary.has-icon');
        
        if (saveButton) {
            if (isSaved) {
                saveButton.classList.add('saved');
                saveButton.classList.remove('removed');
                saveButton.querySelector('.material-symbols-outlined').textContent = 'bookmark';
                saveButton.querySelector('.label-large').textContent = 'Saved';
                saveButton.setAttribute('aria-label', 'Remove from saved recipes');
            } else {
                saveButton.classList.remove('saved');
                saveButton.classList.add('removed');
                saveButton.querySelector('.material-symbols-outlined').textContent = 'bookmark_add';
                saveButton.querySelector('.label-large').textContent = 'Save';
                saveButton.setAttribute('aria-label', 'Save recipe');
            }
        }
    } catch (error) {
        console.error("Error checking saved state:", error);
    }
}

// Process TheMealDB tags to create a comprehensive list
function processMealDBTags(category, area, tags) {
    const allTags = new Set();
    
    // Add category if it exists
    if (category && category.trim() !== "") {
        allTags.add(category);
    }
    
    // Add area/cuisine if it exists
    if (area && area.trim() !== "") {
        allTags.add(area);
    }
    
    // Add individual tags from strTags field
    if (tags && tags.length > 0) {
        tags.forEach(tag => {
            if (tag && tag.trim() !== "") {
                allTags.add(tag);
            }
        });
    }
    
    // Add common TheMealDB tags based on category and area
    addCommonMealDBTags(allTags, category, area);
    
    return Array.from(allTags);
}

// Add common tags based on TheMealDB categories and cuisines
function addCommonMealDBTags(tagsSet, category, area) {
    // Common TheMealDB categories
    const mealDBCategories = [
        'Beef', 'Chicken', 'Dessert', 'Lamb', 'Miscellaneous', 'Pasta', 
        'Pork', 'Seafood', 'Side', 'Starter', 'Vegan', 'Vegetarian', 
        'Breakfast', 'Goat'
    ];
    
    // Common TheMealDB areas/cuisines
    const mealDBAreas = [
        'American', 'British', 'Canadian', 'Chinese', 'Croatian', 'Dutch', 
        'Egyptian', 'French', 'Greek', 'Indian', 'Irish', 'Italian', 
        'Jamaican', 'Japanese', 'Kenyan', 'Malaysian', 'Mexican', 'Moroccan', 
        'Polish', 'Portuguese', 'Russian', 'Spanish', 'Thai', 'Tunisian', 
        'Turkish', 'Unknown', 'Vietnamese'
    ];
    
    // Add relevant tags based on category
    if (category) {
        // Add cooking method tags based on category
        if (['Beef', 'Chicken', 'Pork', 'Lamb'].includes(category)) {
            tagsSet.add('Meat');
            tagsSet.add('MainCourse');
        }
        if (category === 'Seafood') {
            tagsSet.add('Fish');
            tagsSet.add('MainCourse');
        }
        if (['Vegetarian', 'Vegan'].includes(category)) {
            tagsSet.add('PlantBased');
            tagsSet.add('Healthy');
        }
        if (category === 'Dessert') {
            tagsSet.add('Sweet');
            tagsSet.add('Treat');
        }
        if (['Breakfast', 'Starter'].includes(category)) {
            tagsSet.add('Appetizer');
        }
        if (category === 'Side') {
            tagsSet.add('Accompaniment');
        }
    }
    
    // Add relevant tags based on area/cuisine
    if (area) {
        if (['Italian', 'French', 'Spanish', 'Greek'].includes(area)) {
            tagsSet.add('Mediterranean');
            tagsSet.add('European');
        }
        if (['Chinese', 'Japanese', 'Thai', 'Vietnamese'].includes(area)) {
            tagsSet.add('Asian');
        }
        if (['Indian', 'Malaysian'].includes(area)) {
            tagsSet.add('Spicy');
            tagsSet.add('Asian');
        }
        if (['Mexican', 'Moroccan'].includes(area)) {
            tagsSet.add('Spicy');
        }
    }
}

// Determine the filter type for a tag
function getFilterTypeForTag(tag) {
    // TheMealDB categories
    const mealDBCategories = [
        'Beef', 'Chicken', 'Dessert', 'Lamb', 'Miscellaneous', 'Pasta', 
        'Pork', 'Seafood', 'Side', 'Starter', 'Vegan', 'Vegetarian', 
        'Breakfast', 'Goat'
    ];
    
    // TheMealDB areas/cuisines
    const mealDBAreas = [
        'American', 'British', 'Canadian', 'Chinese', 'Croatian', 'Dutch', 
        'Egyptian', 'French', 'Greek', 'Indian', 'Irish', 'Italian', 
        'Jamaican', 'Japanese', 'Kenyan', 'Malaysian', 'Mexican', 'Moroccan', 
        'Polish', 'Portuguese', 'Russian', 'Spanish', 'Thai', 'Tunisian', 
        'Turkish', 'Unknown', 'Vietnamese'
    ];
    
    if (mealDBCategories.includes(tag)) {
        return 'c'; // Category filter
    } else if (mealDBAreas.includes(tag)) {
        return 'a'; // Area/Cuisine filter
    } else {
        return 'q'; // Search query for other tags
    }
}

// Format instructions with proper numbering
function formatInstructions(instructions) {
    if (!instructions) return '<p>No instructions available.</p>';
    
    // Split by new lines and number them
    const steps = instructions.split('\n')
        .map(step => step.trim())
        .filter(step => step !== '')
        .map((step, index) => {
            // Remove any existing numbers at the start
            const cleanStep = step.replace(/^\d+[\.\)]\s*/, '');
            return `<p><strong>${index + 1}.</strong> ${cleanStep}</p>`;
        })
        .join('');
    
    return steps || '<p>No instructions available.</p>';
}

// Snackbar function
function showSnackbar(message) {
    const snackbarContainer = document.querySelector('.snackbar-container');
    if (snackbarContainer) {
        const snackbar = document.createElement('div');
        snackbar.className = 'snackbar';
        snackbar.innerHTML = `<p class="body-medium">${message}</p>`;
        snackbarContainer.appendChild(snackbar);
        
        // Remove snackbar after animation
        setTimeout(() => {
            if (snackbar.parentNode) {
                snackbar.parentNode.removeChild(snackbar);
            }
        }, 3000);
    }
}

// Add error handling for images
document.addEventListener('DOMContentLoaded', function() {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        img.addEventListener('error', function() {
            this.src = './assets/images/recipe.jpg';
        });
    });
});