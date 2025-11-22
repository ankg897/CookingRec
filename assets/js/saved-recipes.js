"use strict";

import { auth, db } from './firebaseauth.js';
import { 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { 
    collection, 
    getDocs,
    doc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const $savedRecipeContainer = document.querySelector("[data-saved-recipe-container]");

// Check if user is logged in before loading saved recipes
document.addEventListener('DOMContentLoaded', function() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in, load their saved recipes from Firestore
            console.log("Loading saved recipes for user:", user.uid);
            loadSavedRecipesFromFirestore(user.uid);
        } else {
            // User is not signed in, show message
            showLoginPrompt();
        }
    });
});

// Show login prompt when user is not logged in
function showLoginPrompt() {
    if ($savedRecipeContainer) {
        $savedRecipeContainer.innerHTML = `
            <div class="error-state" style="text-align: center; padding: 4rem 2rem;">
                <h2 class="headline-small">Please log in to view your saved recipes</h2>
                <p class="body-medium" style="margin: 1rem 0;">Sign in to access your personal collection of saved recipes.</p>
                <a href="./login.html" class="btn btn-primary">Login</a>
            </div>
        `;
    }
}

// Load saved recipes from Firestore
async function loadSavedRecipesFromFirestore(userId) {
    if (!$savedRecipeContainer) return;

    try {
        // Show loading state
        $savedRecipeContainer.innerHTML = `
            <div class="loading-message">
                <h2 class="headline-small section-title">Your Saved Recipes</h2>
                <p class="body-large">Loading your saved recipes...</p>
            </div>
        `;

        // Get saved recipes from Firestore
        const savedRecipesRef = collection(db, 'users', userId, 'savedRecipes');
        const querySnapshot = await getDocs(savedRecipesRef);

        if (querySnapshot.empty) {
            $savedRecipeContainer.innerHTML = `
                <h2 class="headline-small section-title">Your Saved Recipes</h2>
                <div class="error-state" style="text-align: center; padding: 2rem;">
                    <p class="body-large">You don't have any saved recipes yet!</p>
                    <p class="body-medium" style="margin: 1rem 0;">Start saving recipes to see them here.</p>
                    <a href="./recipes.html" class="btn btn-primary">Browse Recipes</a>
                </div>
            `;
            return;
        }

        // Process saved recipes
        const savedRecipes = [];
        for (const docSnapshot of querySnapshot.docs) {
            const recipeData = docSnapshot.data();
            savedRecipes.push({
                id: docSnapshot.id,
                ...recipeData
            });
        }

        displaySavedRecipes(savedRecipes, userId);
    } catch (error) {
        console.error("Error loading saved recipes from Firestore:", error);
        $savedRecipeContainer.innerHTML = `
            <div class="error-state" style="text-align: center; padding: 2rem;">
                <h2 class="headline-small">Error loading recipes</h2>
                <p class="body-medium">Please try again later.</p>
                <button onclick="location.reload()" class="btn btn-primary">Retry</button>
            </div>
        `;
    }
}

// Display saved recipes
function displaySavedRecipes(recipes, userId) {
    if (!$savedRecipeContainer) return;

    // Clear container and add title
    $savedRecipeContainer.innerHTML = `
        <h2 class="headline-small section-title">Your Saved Recipes</h2>
        <p class="body-medium">You have ${recipes.length} saved recipe${recipes.length !== 1 ? 's' : ''}</p>
    `;

    const $gridList = document.createElement("div");
    $gridList.classList.add("grid-list");
    $gridList.style.marginTop = "20px";

    if (recipes.length > 0) {
        recipes.forEach((recipe, index) => {
            const { id, title, image, category, area } = recipe;
            
            const $card = document.createElement("div");
            $card.classList.add("card");
            $card.style.animationDelay = `${100 * index}ms`;

            $card.innerHTML = `
                <figure class="card-media img-holder">
                    <img src="${image || './assets/images/recipe.jpg'}" width="195" height="195" loading="lazy" alt="${title || 'Untitled Recipe'}" class="img-cover">
                </figure>
                <div class="card-body">
                    <div class="card-header">
                        <h3 class="title-small">
                            <a href="./detail.html?recipe=${id}" class="card-link">${title || "Untitled Recipe"}</a>
                        </h3>
                        <button class="save-btn saved" 
                                aria-label="Click to unsave recipe" 
                                onclick="removeSavedRecipe('${id}', '${userId}', this)">
                            <span class="material-symbols-outlined bookmark-add" aria-hidden="true">bookmark_add</span>
                            <span class="material-symbols-outlined bookmark" aria-hidden="true">bookmark</span>   
                        </button>
                    </div>
                    <div class="meta-wrapper">
                        ${category ? `<div class="meta-item">
                            <span class="material-symbols-outlined" aria-hidden="true">category</span>
                            <span class="label-medium">${category}</span>
                        </div>` : ''}
                        ${area ? `<div class="meta-item">
                            <span class="material-symbols-outlined" aria-hidden="true">public</span>
                            <span class="label-medium">${area}</span>
                        </div>` : ''}
                    </div>
                </div>
            `;

            $gridList.appendChild($card);
        });
    }

    $savedRecipeContainer.appendChild($gridList);
}

// Remove saved recipe from Firestore
window.removeSavedRecipe = async function(recipeId, userId, buttonElement) {
    if (!auth.currentUser) {
        alert('Please log in to manage your saved recipes');
        return;
    }

    try {
        // Remove from Firestore
        const recipeDocRef = doc(db, 'users', userId, 'savedRecipes', recipeId);
        await deleteDoc(recipeDocRef);
        
        // Update UI
        const card = buttonElement.closest('.card');
        card.style.opacity = '0.5';
        
        setTimeout(() => {
            card.remove();
            // Update the recipe count
            const remainingRecipes = document.querySelectorAll('.card').length;
            const countElement = $savedRecipeContainer.querySelector('.body-medium');
            if (countElement && remainingRecipes === 0) {
                $savedRecipeContainer.innerHTML = `
                    <h2 class="headline-small section-title">Your Saved Recipes</h2>
                    <div class="error-state" style="text-align: center; padding: 2rem;">
                        <p class="body-large">You don't have any saved recipes yet!</p>
                        <p class="body-medium" style="margin: 1rem 0;">Start saving recipes to see them here.</p>
                        <a href="./recipes.html" class="btn btn-primary">Browse Recipes</a>
                    </div>
                `;
            } else if (countElement) {
                countElement.textContent = `You have ${remainingRecipes} saved recipe${remainingRecipes !== 1 ? 's' : ''}`;
            }
        }, 300);
        
    } catch (error) {
        console.error("Error removing saved recipe:", error);
        alert('Error removing recipe. Please try again.');
    }
}