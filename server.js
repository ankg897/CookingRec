// server.js - SIMPLE VERSION
const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Serve ALL files from current directory
app.use(express.static(__dirname));

app.listen(PORT, () => {
    console.log('🎯 CookingFrenzy Server Started!');
    console.log(`📡 Server running at: http://localhost:${PORT}`);
    console.log('💾 Your saved recipes will now persist properly!');
    console.log('🛑 To stop server: Press Ctrl + C');
    console.log('');
    console.log('📝 Available pages:');
    console.log(`   Home: http://localhost:${PORT}/`);
    console.log(`   Recipes: http://localhost:${PORT}/recipes.html`);
    console.log(`   Saved Recipes: http://localhost:${PORT}/saved-recipes.html`);
});