// Import the functions you need from the SDKs you need
"use strict";

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { 
  getFirestore, 
  setDoc, 
  doc,
  getDoc,
  deleteDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCyBMvaIxG14Emf-HfS5Zc2G3La1_X-N84",
  authDomain: "recipe-web-6c0f0.firebaseapp.com",
  projectId: "recipe-web-6c0f0",
  storageBucket: "recipe-web-6c0f0.firebasestorage.app",
  messagingSenderId: "624138394264",
  appId: "1:624138394264:web:ce4f59e6a0a8ba06e34eed",
  measurementId: "G-RLKM9R7V0B"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Set persistence to local (saves session across tabs and browser restarts)
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Auth persistence set to local");
  })
  .catch((error) => {
    console.error("Error setting auth persistence:", error);
  });

// Message display function
function showMessage(message, divId, isSuccess = false) {
  const messageDiv = document.getElementById(divId);
  if (messageDiv) {
    messageDiv.style.display = "block";
    messageDiv.innerHTML = message;
    messageDiv.className = isSuccess ? 'messageDiv success' : 'messageDiv';
    messageDiv.style.opacity = 1;
    
    setTimeout(function() {
      messageDiv.style.opacity = 0;
      setTimeout(() => {
        messageDiv.style.display = "none";
      }, 500);
    }, 4000);
  }
}

// Global user state
window.currentUser = null;

// Auth state management for all pages
document.addEventListener('DOMContentLoaded', function() {
  console.log("Setting up auth state listener...");
  
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // User is signed in
      console.log("User logged in:", user.email);
      window.currentUser = user;
      updateUIForLoggedInUser(user);
      
      // If on login page, redirect to home
      if (window.location.pathname.includes('login.html')) {
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1000);
      }
    } else {
      // User is signed out
      console.log("User signed out");
      window.currentUser = null;
      updateUIForLoggedOutUser();
      
      // If on protected pages, redirect to login
      const protectedPages = ['profile.html', 'my-recipes.html', 'add-recipe.html', 'saved-recipes.html'];
      const currentPage = window.location.pathname.split('/').pop();
      
      if (protectedPages.includes(currentPage)) {
        window.location.href = 'login.html';
      }
    }
  });
});

// Update UI for logged in user
function updateUIForLoggedInUser(user) {
  console.log("Updating UI for logged in user");
  
  // Update header with user info
  const header = document.querySelector('header');
  if (header && !document.getElementById('userInfo')) {
    const userInfo = document.createElement('div');
    userInfo.id = 'userInfo';
    userInfo.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      margin-left: auto;
      margin-right: 15px;
      color: var(--text-color);
    `;
    
    const userName = user.displayName || user.email.split('@')[0];
    userInfo.innerHTML = `
      <span class="body-small" style="color: var(--on-background);">Hi, ${userName}</span>
      <button onclick="logout()" class="btn btn-secondary" style="padding: 5px 10px; font-size: 0.8rem;">
        Logout
      </button>
    `;
    
    // Insert before the theme switch button or at the end
    const themeSwitch = header.querySelector('.theme-switch');
    if (themeSwitch) {
      header.insertBefore(userInfo, themeSwitch);
    } else {
      header.appendChild(userInfo);
    }
  }
  
  // Update saved recipes link to show user-specific content
  const savedRecipesLink = document.querySelector('a[href="./saved-recipes.html"]');
  if (savedRecipesLink) {
    savedRecipesLink.style.display = 'flex';
  }
}

// Update UI for logged out user
function updateUIForLoggedOutUser() {
  console.log("Updating UI for logged out user");
  
  // Remove user info from header
  const userInfo = document.getElementById('userInfo');
  if (userInfo) {
    userInfo.remove();
  }
  
  // Show login/signup buttons if on pages that need them
  if (!window.location.pathname.includes('login.html')) {
    const header = document.querySelector('header');
    if (header && !document.querySelector('.auth-buttons')) {
      const authButtons = document.createElement('div');
      authButtons.className = 'auth-buttons';
      authButtons.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        margin-left: auto;
        margin-right: 15px;
      `;
      
      authButtons.innerHTML = `
        <a href="./login.html" class="btn btn-secondary" style="padding: 5px 10px; font-size: 0.8rem;">
          Login
        </a>
        <a href="./login.html" class="btn btn-primary" style="padding: 5px 10px; font-size: 0.8rem;">
          Sign Up
        </a>
      `;
      
      const themeSwitch = header.querySelector('.theme-switch');
      if (themeSwitch) {
        header.insertBefore(authButtons, themeSwitch);
      } else {
        header.appendChild(authButtons);
      }
    }
  }
}

// Google Sign-In function
window.signInWithGoogle = async function() {
  console.log("Google Sign-In clicked");
  
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    
    showMessage('Opening Google Sign-In...', 'signInMessage', true);
    
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    console.log("Google Sign-In successful:", user);
    
    // Create user data for Firestore
    const userData = {
      email: user.email,
      firstName: user.displayName ? user.displayName.split(' ')[0] : 'User',
      lastName: user.displayName ? user.displayName.split(' ').slice(1).join(' ') : '',
      photoURL: user.photoURL || '',
      createdAt: new Date(),
      provider: 'google'
    };
    
    // Save user data to Firestore
    const docRef = doc(db, 'users', user.uid);
    await setDoc(docRef, userData, { merge: true });
    
    showMessage('✓ Logged in successfully with Google!', 'signInMessage', true);
    
    // Session is automatically maintained by Firebase persistence
    // Redirect to main page after successful login
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1500);
    
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    
    let errorMessage = 'Error signing in with Google';
    
    switch (error.code) {
      case 'auth/operation-not-allowed':
        errorMessage = 'Google Sign-In is not enabled. Please enable it in Firebase Console.';
        showMessage('Google Sign-In not enabled. <br><a href="https://console.firebase.google.com/" target="_blank" style="color: blue; text-decoration: underline;">Click here to enable it in Firebase Console</a><br>Then go to: Authentication → Sign-in method → Google → Enable', 'signInMessage');
        return;
      case 'auth/popup-closed-by-user':
        errorMessage = 'Sign-in was cancelled';
        break;
      case 'auth/popup-blocked':
        errorMessage = 'Sign-in popup was blocked. Please allow popups for this site.';
        break;
      case 'auth/unauthorized-domain':
        errorMessage = 'This domain is not authorized for Google Sign-In.';
        break;
      default:
        errorMessage = `Sign-in failed: ${error.message}`;
    }
    
    showMessage(errorMessage, 'signInMessage');
  }
}

// Email/Password Sign Up
const signUp = document.getElementById("submitSignUp");
if (signUp) {
  signUp.addEventListener('click', (event) => {
    event.preventDefault();
    const email = document.getElementById('rEmail').value;
    const password = document.getElementById('rPassword').value;
    const firstName = document.getElementById('fName').value;
    const lastName = document.getElementById('lName').value;
    
    // Basic validation
    if (!firstName || !lastName || !email || !password) {
      showMessage('Please fill in all fields!', 'signUpMessage');
      return;
    }
    
    if (password.length < 6) {
      showMessage('Password must be at least 6 characters long!', 'signUpMessage');
      return;
    }
    
    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        const userData = {
          email: email,
          firstName: firstName,
          lastName: lastName,
          createdAt: new Date(),
          provider: 'email'
        };
        
        showMessage('Account created successfully!', 'signUpMessage', true);
        
        const docRef = doc(db, 'users', user.uid);
        setDoc(docRef, userData)
        .then(() => {
          // Session is automatically maintained by Firebase persistence
          // Redirect after successful signup
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 1500);
        })
        .catch((error) => {
          console.error("Error writing document", error);
          showMessage('Account created but there was an error saving profile data.', 'signUpMessage');
        });
      })
      .catch((error) => {
        const errorCode = error.code;
        let errorMessage = 'Something went wrong!';
        
        if (errorCode === 'auth/email-already-in-use') {
          errorMessage = 'Email already exists!';
        } else if (errorCode === 'auth/invalid-email') {
          errorMessage = 'Invalid email address!';
        } else if (errorCode === 'auth/weak-password') {
          errorMessage = 'Password is too weak!';
        }
        
        showMessage(errorMessage, 'signUpMessage');
      });
  });
}

// Email/Password Sign In
const signIn = document.getElementById("submitSignIn");
if (signIn) {
  signIn.addEventListener('click', (event) => {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Basic validation
    if (!email || !password) {
      showMessage('Please fill in all fields!', 'signInMessage');
      return;
    }
    
    signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      showMessage('✓ Logged in successfully!', 'signInMessage', true);
      // Session is automatically maintained by Firebase persistence
      // Redirect after successful login
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1500);
    })
    .catch((error) => {
      let errorMessage = 'Account does not exist!';
      
      if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Incorrect email or password!';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address!';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled!';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      }
      
      showMessage(errorMessage, 'signInMessage');
    });
  });
}

// Enter key support for forms (only on login page)
if (window.location.pathname.includes('login.html')) {
  document.addEventListener('DOMContentLoaded', function() {
    const signUpForm = document.querySelector('#signup form');
    if (signUpForm) {
      signUpForm.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          document.getElementById('submitSignUp').click();
        }
      });
    }
    
    const signInForm = document.querySelector('#signIn form');
    if (signInForm) {
      signInForm.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          document.getElementById('submitSignIn').click();
        }
      });
    }
  });
}

// Global logout function
window.logout = function() {
  signOut(auth).then(() => {
    console.log("User signed out successfully");
    window.currentUser = null;
    // Redirect to home page after logout
    window.location.href = 'index.html';
  }).catch((error) => {
    console.error("Logout error:", error);
  });
};

// Utility function to check if user is logged in (for other scripts)
window.isUserLoggedIn = function() {
  return window.currentUser !== null;
};

// Utility function to get current user (for other scripts)
window.getCurrentUser = function() {
  return window.currentUser;
};

// Firestore functions for saved recipes
window.saveRecipeToFirestore = async function(recipeData) {
  if (!auth.currentUser) {
    alert('Please log in to save recipes');
    return false;
  }

  try {
    const userId = auth.currentUser.uid;
    const recipeDocRef = doc(db, 'users', userId, 'savedRecipes', recipeData.id);
    
    // Save recipe data to Firestore
    await setDoc(recipeDocRef, {
      title: recipeData.title,
      image: recipeData.image,
      category: recipeData.category || '',
      area: recipeData.area || '',
      savedAt: new Date()
    });
    
    console.log("Recipe saved to Firestore:", recipeData.id);
    return true;
  } catch (error) {
    console.error("Error saving recipe to Firestore:", error);
    return false;
  }
}

window.isRecipeSavedInFirestore = async function(recipeId) {
  if (!auth.currentUser) return false;

  try {
    const userId = auth.currentUser.uid;
    const recipeDocRef = doc(db, 'users', userId, 'savedRecipes', recipeId);
    const docSnapshot = await getDoc(recipeDocRef);
    
    return docSnapshot.exists();
  } catch (error) {
    console.error("Error checking saved recipe:", error);
    return false;
  }
}

window.removeRecipeFromFirestore = async function(recipeId) {
  if (!auth.currentUser) return false;

  try {
    const userId = auth.currentUser.uid;
    const recipeDocRef = doc(db, 'users', userId, 'savedRecipes', recipeId);
    await deleteDoc(recipeDocRef);
    
    console.log("Recipe removed from Firestore:", recipeId);
    return true;
  } catch (error) {
    console.error("Error removing recipe from Firestore:", error);
    return false;
  }
}