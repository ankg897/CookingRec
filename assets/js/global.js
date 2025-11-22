"use strict";

import { fetchData } from "./api.js";
import { auth } from './firebaseauth.js';

// Utility function to add events to multiple elements
window.addEventOnElements = ($elements, eventType, callback) => {
    for (const $element of $elements) {
        $element.addEventListener(eventType, callback);
    }
}

// Card queries for API - REMOVED totalTime
export const cardQueries = [
    ["field", "uri"],
    ["field", "label"], 
    ["field", "image"]
    // Removed: ["field", "totalTime"]
];

// Skeleton card template
export const $skeletonCard = `
<div class="card skeleton-card">
    <div class="skeleton card-banner"></div>
    <div class="card-body">
        <div class="skeleton card-title"></div>
        <div class="skeleton card-text"></div>
    </div>
</div>
`;

// Global save recipe function - UPDATED for Firestore
window.saveRecipe = async function (element, recipeId) {
    // Check if user is logged in
    if (!auth?.currentUser) {
        alert('Please log in to save recipes');
        return;
    }

    // Prevent event bubbling to avoid card link click
    if (event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
    }
    
    const card = element.closest('.card');
    const title = card.querySelector('.card-link').textContent;
    const image = card.querySelector('img').src;
    
    try {
        const isSaved = await window.isRecipeSavedInFirestore?.(recipeId);

        if (isSaved) {
            // Remove from saved
            const success = await window.removeRecipeFromFirestore?.(recipeId);
            
            if (success) {
                element.classList.remove("saved");
                element.classList.add("removed");
                showNotification('Removed from Recipe Book');
                element.setAttribute('aria-label', 'Click to save recipe');
                
                // Show feedback
                showSaveFeedback(false, title);
            }
        } else {
            // Save recipe
            const recipeData = {
                id: recipeId,
                title: title,
                image: image,
                savedAt: new Date().toISOString()
            };
            
            const success = await window.saveRecipeToFirestore?.(recipeData);
            
            if (success) {
                element.classList.add("saved");
                element.classList.remove("removed");
                showNotification('Added to Recipe Book');
                element.setAttribute('aria-label', 'Click to unsave recipe');
                
                // Show feedback
                showSaveFeedback(true, title);
            }
        }
    } catch (error) {
        console.error("Error toggling save state:", error);
        alert('Error saving recipe. Please try again.');
    }
}

// Show save/unsave feedback
function showSaveFeedback(isSaved, title) {
    console.log(`${isSaved ? 'Saved' : 'Unsaved'}: ${title}`);
}

const $snackbarContainer = document.createElement('div');
$snackbarContainer.classList.add('snackbar-container');
document.body.appendChild($snackbarContainer);

function showNotification(message) {
    const $snackbar = document.createElement('div');
    $snackbar.classList.add('snackbar');
    $snackbar.innerHTML = `<p class="body-medium">${message}</p>`;
    $snackbarContainer.appendChild($snackbar);
    $snackbar.addEventListener('animationend', e => $snackbarContainer.removeChild($snackbar));
}

// Add function to check saved state for cards
async function checkSavedStateForCards() {
    if (!auth?.currentUser) return;

    const saveButtons = document.querySelectorAll('.save-btn');
    
    for (const button of saveButtons) {
        const card = button.closest('.card');
        const recipeLink = card.querySelector('.card-link');
        const recipeId = recipeLink?.href?.match(/recipe=([^&]+)/)?.[1];
        
        if (recipeId) {
            try {
                const isSaved = await window.isRecipeSavedInFirestore?.(recipeId);
                
                if (isSaved) {
                    button.classList.add("saved");
                    button.classList.remove("removed");
                    button.setAttribute('aria-label', 'Click to unsave recipe');
                } else {
                    button.classList.remove("saved");
                    button.classList.add("removed");
                    button.setAttribute('aria-label', 'Click to save recipe');
                }
            } catch (error) {
                console.error("Error checking saved state for recipe:", recipeId, error);
            }
        }
    }
}

// Call this function when recipes are loaded
window.checkSavedStates = checkSavedStateForCards;