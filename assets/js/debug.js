// debug.js - Emergency diagnostics
console.log("🔧 DEBUG: Script started");
console.log("📄 Current page:", window.location.pathname);

// Check if critical elements exist
const criticalElements = [
    '[data-search-field]',
    '[data-search-btn]',
    '[data-grid-list]',
    '[data-detail-container]',
    '[data-saved-recipe-container]'
];

criticalElements.forEach(selector => {
    const element = document.querySelector(selector);
    console.log(`🔍 ${selector}:`, element ? "✅ FOUND" : "❌ MISSING");
});

// Check if functions exist
console.log("📋 Functions check:");
console.log(" - saveRecipe:", typeof window.saveRecipe);
console.log(" - fetchData:", typeof window.fetchData);
console.log(" - addEventOnElements:", typeof window.addEventOnElements);