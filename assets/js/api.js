"use strict";

window.ACCESS_POINT = "https://www.themealdb.com/api/json/v1/1";

// Original function for home page (OR logic)
export const fetchData = async function (queries, successCallback) {
    let category = "";
    let searchQuery = "";
    let area = "";
    
    console.log("Fetching data with queries:", queries);
    
    if (queries && queries.length > 0) {
        for (const [key, value] of queries) {
            if (key === 'c' || key === 'category') {
                category = value;
            } else if (key === 'q') {
                searchQuery = value;
            } else if (key === 'a' || key === 'area') {
                area = value;
            }
        }
    }

    let url;
    if (category) {
        url = `${ACCESS_POINT}/filter.php?c=${encodeURIComponent(category)}`;
    } else if (area) {
        url = `${ACCESS_POINT}/filter.php?a=${encodeURIComponent(area)}`;
    } else if (searchQuery) {
        url = `${ACCESS_POINT}/search.php?s=${encodeURIComponent(searchQuery)}`;
    } else {
        // Get random recipes instead of empty search to avoid 404
        url = `${ACCESS_POINT}/random.php`;
    }

    console.log("API URL:", url);

    try {
        const response = await fetch(url);
        console.log("Response status:", response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log("Raw API data:", data);
            
            // Handle 404 responses from TheMealDB
            if (data.meals === null) {
                console.log("No meals found in response");
                successCallback({ hits: [] });
                return;
            }
            
            const convertedData = convertMealDBResponse(data);
            console.log("Converted data:", convertedData);
            successCallback(convertedData);
        } else {
            console.error("Response not OK:", response.status);
            successCallback({ hits: [] });
        }
    } catch (error) {
        console.error('API Error:', error);
        successCallback({ hits: [] });
    }
}

// New function for recipe page with AND logic
export const fetchDataWithAndLogic = async function (queries, successCallback) {
    let categories = [];
    let searchQuery = "";
    let areas = [];
    
    console.log("Fetching data with AND logic queries:", queries);
    
    if (queries && queries.length > 0) {
        for (const [key, value] of queries) {
            if (key === 'c' || key === 'category') {
                categories.push(value);
            } else if (key === 'q') {
                searchQuery = value;
            } else if (key === 'a' || key === 'area') {
                areas.push(value);
            }
        }
    }

    // If we have multiple filters, use AND logic
    if (categories.length > 0 || areas.length > 0) {
        console.log("Filters detected, using AND logic handler");
        await fetchWithAndLogic(categories, areas, searchQuery, successCallback);
        return;
    }

    // Single search query or no filters (use original logic)
    let url;
    if (searchQuery) {
        url = `${ACCESS_POINT}/search.php?s=${encodeURIComponent(searchQuery)}`;
    } else {
        // Get random recipes instead of empty search
        url = `${ACCESS_POINT}/random.php`;
    }

    console.log("API URL:", url);

    try {
        const response = await fetch(url);
        console.log("Response status:", response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log("Raw API data:", data);
            
            // Handle 404 responses
            if (data.meals === null) {
                console.log("No meals found in response");
                successCallback({ hits: [] });
                return;
            }
            
            const convertedData = convertMealDBResponse(data);
            console.log("Converted data:", convertedData);
            successCallback(convertedData);
        } else {
            console.error("Response not OK:", response.status);
            successCallback({ hits: [] });
        }
    } catch (error) {
        console.error('API Error:', error);
        successCallback({ hits: [] });
    }
}

// AND logic implementation - FIXED to handle 404 responses
const fetchWithAndLogic = async function (categories, areas, searchQuery, successCallback) {
    console.log("Fetching with AND logic:", { categories, areas, searchQuery });
    
    try {
        let allMeals = [];
        
        // If we have specific filters, try to get more comprehensive results
        if (categories.length > 0 || areas.length > 0) {
            // Fetch from multiple sources to get more recipes
            const fetchPromises = [];
            
            // Fetch by categories
            categories.forEach(category => {
                fetchPromises.push(
                    fetch(`${ACCESS_POINT}/filter.php?c=${encodeURIComponent(category)}`)
                        .then(res => res.json())
                        .then(data => {
                            // Handle 404 responses
                            if (data.meals === null) return [];
                            return data.meals || [];
                        })
                        .catch(() => [])
                );
            });
            
            // Fetch by areas
            areas.forEach(area => {
                fetchPromises.push(
                    fetch(`${ACCESS_POINT}/filter.php?a=${encodeURIComponent(area)}`)
                        .then(res => res.json())
                        .then(data => {
                            // Handle 404 responses
                            if (data.meals === null) return [];
                            return data.meals || [];
                        })
                        .catch(() => [])
                );
            });
            
            // Also fetch some random recipes to increase pool
            if (categories.length === 0 && areas.length === 0 && searchQuery) {
                // For search queries, fetch multiple random recipes
                for (let i = 0; i < 3; i++) {
                    fetchPromises.push(
                        fetch(`${ACCESS_POINT}/random.php`)
                            .then(res => res.json())
                            .then(data => data.meals || [])
                            .catch(() => [])
                    );
                }
            }
            
            const results = await Promise.all(fetchPromises);
            
            // Combine all meals and remove duplicates
            const seenIds = new Set();
            results.forEach(meals => {
                meals.forEach(meal => {
                    if (meal && meal.idMeal && !seenIds.has(meal.idMeal)) {
                        seenIds.add(meal.idMeal);
                        allMeals.push(meal);
                    }
                });
            });
            
            console.log(`Initial pool: ${allMeals.length} recipes`);
            
            // If we have multiple filters, fetch details and apply AND logic
            if (allMeals.length > 0 && ((categories.length > 0 && areas.length > 0) || (categories.length + areas.length + (searchQuery ? 1 : 0)) > 1)) {
                console.log(`Fetching details for ${allMeals.length} recipes...`);
                
                const detailedPromises = allMeals.map(meal => 
                    fetch(`${ACCESS_POINT}/lookup.php?i=${meal.idMeal}`)
                        .then(res => res.json())
                        .then(data => {
                            if (!data.meals || data.meals === null) return null;
                            return data.meals[0];
                        })
                        .catch(error => {
                            console.error(`Error fetching details for ${meal.idMeal}:`, error);
                            return null;
                        })
                );
                
                const detailedResults = await Promise.all(detailedPromises);
                const detailedMeals = detailedResults.filter(meal => meal !== null);
                
                console.log(`Successfully fetched details for ${detailedMeals.length} recipes`);
                
                // Apply AND filtering
                const filteredMeals = detailedMeals.filter(meal => {
                    // Check all categories (AND logic)
                    if (categories.length > 0) {
                        const mealCategory = meal.strCategory;
                        if (!categories.includes(mealCategory)) {
                            return false;
                        }
                    }
                    
                    // Check all areas (AND logic)
                    if (areas.length > 0) {
                        const mealArea = meal.strArea;
                        if (!areas.includes(mealArea)) {
                            return false;
                        }
                    }
                    
                    // Check search query
                    if (searchQuery) {
                        const mealName = meal.strMeal ? meal.strMeal.toLowerCase() : '';
                        const searchTerm = searchQuery.toLowerCase();
                        if (!mealName.includes(searchTerm)) {
                            return false;
                        }
                    }
                    
                    return true;
                });
                
                allMeals = filteredMeals;
            }
        } else {
            // No specific filters, use search or random
            if (searchQuery) {
                const url = `${ACCESS_POINT}/search.php?s=${encodeURIComponent(searchQuery)}`;
                const response = await fetch(url);
                const data = await response.json();
                allMeals = (data.meals && data.meals !== null) ? data.meals : [];
            } else {
                // Get multiple random recipes
                const randomPromises = Array.from({ length: 5 }, () => 
                    fetch(`${ACCESS_POINT}/random.php`)
                        .then(res => res.json())
                        .then(data => data.meals || [])
                        .catch(() => [])
                );
                
                const randomResults = await Promise.all(randomPromises);
                const seenIds = new Set();
                
                randomResults.forEach(meals => {
                    meals.forEach(meal => {
                        if (meal && meal.idMeal && !seenIds.has(meal.idMeal)) {
                            seenIds.add(meal.idMeal);
                            allMeals.push(meal);
                        }
                    });
                });
            }
        }
        
        console.log(`Final AND result: ${allMeals.length} recipes`);
        
        const convertedData = {
            hits: allMeals.map(meal => ({
                recipe: {
                    uri: `recipe_${meal.idMeal}`,
                    label: meal.strMeal || "Untitled Recipe",
                    image: meal.strMealThumb || "./assets/images/recipe.jpg",
                    ingredients: [],
                    instructions: "",
                    category: meal.strCategory,
                    area: meal.strArea
                }
            }))
        };
        
        successCallback(convertedData);
        
    } catch (error) {
        console.error('Error fetching with AND logic:', error);
        successCallback({ hits: [] });
    }
}

export const fetchAllRecipes = async function (successCallback) {
    console.log("Fetching random recipes");
    
    try {
        // Fetch multiple random recipes
        const randomPromises = Array.from({ length: 10 }, () => 
            fetch(`${ACCESS_POINT}/random.php`)
                .then(res => res.json())
                .then(data => data.meals || [])
                .catch(() => [])
        );
        
        const randomResults = await Promise.all(randomPromises);
        
        // Combine all meals and remove duplicates
        const allMeals = [];
        const seenIds = new Set();
        
        randomResults.forEach(meals => {
            meals.forEach(meal => {
                if (meal && meal.idMeal && !seenIds.has(meal.idMeal)) {
                    seenIds.add(meal.idMeal);
                    allMeals.push(meal);
                }
            });
        });
        
        const convertedData = {
            hits: allMeals.map(meal => ({
                recipe: {
                    uri: `recipe_${meal.idMeal}`,
                    label: meal.strMeal || "Untitled Recipe",
                    image: meal.strMealThumb || "./assets/images/image-placeholder.jpg",
                    ingredients: [],
                    instructions: ""
                }
            }))
        };
        
        console.log("Fetched random recipes:", convertedData.hits.length);
        successCallback(convertedData);
    } catch (error) {
        console.error('Error fetching random recipes:', error);
        successCallback({ hits: [] });
    }
}

export const fetchRecipeDetail = async function (recipeId, successCallback) {
    console.log("Fetching recipe details for:", recipeId);
    
    const url = `${ACCESS_POINT}/lookup.php?i=${recipeId}`;
    
    try {
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            console.log("Recipe detail data:", data);
            
            if (data.meals && data.meals[0]) {
                const meal = data.meals[0];
                const convertedData = {
                    recipe: {
                        uri: `recipe_${meal.idMeal}`,
                        label: meal.strMeal || "Untitled Recipe",
                        image: meal.strMealThumb || "./assets/images/recipe.jpg",
                        ingredients: getIngredientsList(meal),
                        instructions: meal.strInstructions || "No instructions available.",
                        category: meal.strCategory,
                        area: meal.strArea,
                        tags: meal.strTags ? meal.strTags.split(',') : [],
                        youtube: meal.strYoutube,
                        source: meal.strSource
                    }
                };
                successCallback(convertedData);
            } else {
                successCallback(null);
            }
        } else {
            console.error("Response not OK:", response.status);
            successCallback(null);
        }
    } catch (error) {
        console.error('API Error:', error);
        successCallback(null);
    }
}

const getIngredientsList = (meal) => {
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
        const ingredient = meal[`strIngredient${i}`];
        const measure = meal[`strMeasure${i}`];
        
        if (ingredient && ingredient.trim()) {
            ingredients.push({
                text: `${measure ? measure.trim() : ''} ${ingredient.trim()}`.trim(),
                quantity: measure ? measure.trim() : '',
                food: ingredient.trim()
            });
        }
    }
    return ingredients;
}

const convertMealDBResponse = (data) => {
    // Handle different response formats from MealDB
    if (!data.meals || data.meals === null) {
        console.log("No meals found in response");
        return { hits: [] };
    }

    // If it's a filter response (array of meals with limited data)
    const hits = data.meals.map(meal => ({
        recipe: {
            uri: `recipe_${meal.idMeal}`,
            label: meal.strMeal || "Untitled Recipe",
            image: meal.strMealThumb || "./assets/images/recipe.jpg",
            ingredients: [],
            instructions: "",
            category: meal.strCategory,
            area: meal.strArea
        }
    }));

    console.log("Converted hits:", hits.length);
    return { hits };
}