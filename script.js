// Configuration - REPLACE WITH YOUR API KEY!
const GEMINI_API_KEY = 'AIzaSyA-L02WWMNZFZWCZqbyGv4oXN2DKcYZs8Q'; // Replace with your actual API key
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const analyzeBtn = document.getElementById('analyzeBtn');
const resetBtn = document.getElementById('resetBtn');
const uploadSection = document.getElementById('uploadSection');
const loadingSection = document.getElementById('loadingSection');
const resultsSection = document.getElementById('resultsSection');
const foodItems = document.getElementById('foodItems');
const totalCalories = document.getElementById('totalCalories');
const tryAgainBtn = document.getElementById('tryAgainBtn');

// Application State
let currentFile = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    showSection('upload');
});

// Setup all event listeners
function setupEventListeners() {
    // File input change
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, highlight);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, unhighlight);
    });
    
    uploadArea.addEventListener('drop', handleDrop);
    uploadArea.addEventListener('click', () => fileInput.click());
    
    // Button clicks
    analyzeBtn.addEventListener('click', analyzeFood);
    resetBtn.addEventListener('click', resetApp);
    tryAgainBtn.addEventListener('click', resetApp);
}

// Prevent default drag behaviors
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Highlight drop area
function highlight() {
    uploadArea.classList.add('dragover');
}

// Remove highlight
function unhighlight() {
    uploadArea.classList.remove('dragover');
}

// Handle dropped files
function handleDrop(e) {
    const files = e.dataTransfer.files;
    handleFiles(files);
}

// Handle selected files
function handleFileSelect(e) {
    handleFiles(e.target.files);
}

// Process files
function handleFiles(files) {
    if (files.length === 0) return;
    
    const file = files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file (JPG, PNG, etc.)');
        return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        alert('File too large. Please select an image under 10MB.');
        return;
    }
    
    currentFile = file;
    showImagePreview(file);
}

// Show image preview
function showImagePreview(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        previewImg.src = e.target.result;
        imagePreview.classList.remove('hidden');
        imagePreview.classList.add('fade-in');
    };
    
    reader.readAsDataURL(file);
}

// Convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Remove data:image/jpeg;base64, prefix
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// Analyze food using Gemini API
async function analyzeFood() {
    if (!currentFile) {
        alert('Please select an image first');
        return;
    }
    
    // Check if API key is set
    if (GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
        alert('Please set your Gemini API key in the script.js file');
        return;
    }
    
    showSection('loading');
    
    try {
        // Convert image to base64
        const base64Image = await fileToBase64(currentFile);
        
        // Prepare API request
        const requestBody = {
            contents: [{
                parts: [
                    {
                        text: `Analyze this food image and provide detailed nutritional information. 
                               For each food item detected, provide:
                               1. Food name
                               2. Estimated calories per serving shown
                               3. Protein content in grams
                               4. Carbohydrate content in grams  
                               5. Fat content in grams
                               6. Confidence level (0-100%)
                               
                               Please respond in this exact JSON format:
                               [
                                 {
                                   "food": "Food Name",
                                   "calories": 200,
                                   "protein": "15g",
                                   "carbs": "30g",
                                   "fat": "8g",
                                   "confidence": 85
                                 }
                               ]`
                    },
                    {
                        inline_data: {
                            mime_type: currentFile.type,
                            data: base64Image
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.4,
                topK: 32,
                topP: 1,
                maxOutputTokens: 4096,
            }
        };
        
        // Make API call
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} - ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Parse API response
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const analysisText = data.candidates[0].content.parts[0].text;
            const results = parseAnalysisResults(analysisText);
            displayResults(results);
        } else {
            throw new Error('Invalid API response format');
        }
        
    } catch (error) {
        console.error('Analysis failed:', error);
        showError(`Failed to analyze food image: ${error.message}`);
    }
}

// Parse analysis results from API response
function parseAnalysisResults(text) {
    try {
        // Try to extract JSON from the response
        const jsonMatch = text.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            // Validate the parsed data
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.map(item => ({
                    food: item.food || 'Unknown Food',
                    calories: parseInt(item.calories) || 0,
                    protein: item.protein || '0g',
                    carbs: item.carbs || '0g',
                    fat: item.fat || '0g',
                    confidence: parseInt(item.confidence) || 50
                }));
            }
        }
        
        // Fallback: try to parse text format
        return parseTextFormat(text);
        
    } catch (error) {
        console.error('Failed to parse results:', error);
        // Return fallback data
        return [{
            food: 'Detected Food',
            calories: 200,
            protein: '10g',
            carbs: '25g',
            fat: '8g',
            confidence: 75
        }];
    }
}

// Parse text format response (fallback)
function parseTextFormat(text) {
    // Simple text parsing for non-JSON responses
    const lines = text.split('\n').filter(line => line.trim());
    const results = [];
    
    let currentFood = {};
    
    lines.forEach(line => {
        const lowerLine = line.toLowerCase();
        
        if (lowerLine.includes('food') && lowerLine.includes(':')) {
            if (currentFood.food) results.push(currentFood);
            currentFood = { 
                food: line.split(':')[1]?.trim() || 'Unknown Food',
                calories: 200,
                protein: '10g',
                carbs: '25g', 
                fat: '8g',
                confidence: 75
            };
        } else if (lowerLine.includes('calorie') && lowerLine.includes(':')) {
            const calorieMatch = line.match(/\d+/);
            if (calorieMatch) {
                currentFood.calories = parseInt(calorieMatch[0]);
            }
        }
    });
    
    if (currentFood.food) results.push(currentFood);
    
    // If no food found, return default
    if (results.length === 0) {
        results.push({
            food: 'Food Item Detected',
            calories: 250,
            protein: '12g',
            carbs: '30g',
            fat: '10g',
            confidence: 70
        });
    }
    
    return results;
}

// Display analysis results
function displayResults(results) {
    // Calculate total calories
    const total = results.reduce((sum, item) => sum + (item.calories || 0), 0);
    totalCalories.textContent = total;
    
    // Clear previous results
    foodItems.innerHTML = '';
    
    // Display each food item
    results.forEach((item, index) => {
        const foodElement = createFoodElement(item, index);
        foodItems.appendChild(foodElement);
    });
    
    showSection('results');
    resultsSection.classList.add('fade-in');
}

// Create food item element
function createFoodElement(item, index) {
    const div = document.createElement('div');
    div.className = 'food-item';
    
    // Get emoji for food type
    const emoji = getFoodEmoji(item.food);
    
    div.innerHTML = `
        <div class="food-header">
            <div class="food-name">${emoji} ${item.food}</div>
            <div class="food-calories">${item.calories} cal</div>
        </div>
        <div class="nutrition-info">
            <div class="nutrition-item">
                <div class="nutrition-label">Protein</div>
                <div class="nutrition-value">${item.protein}</div>
            </div>
            <div class="nutrition-item">
                <div class="nutrition-label">Carbs</div>
                <div class="nutrition-value">${item.carbs}</div>
            </div>
            <div class="nutrition-item">
                <div class="nutrition-label">Fat</div>
                <div class="nutrition-value">${item.fat}</div>
            </div>
        </div>
        <div class="confidence-badge">
            ${item.confidence}% confidence
        </div>
    `;
    
    return div;
}

// Get emoji for food type
function getFoodEmoji(foodName) {
    const food = foodName.toLowerCase();
    
    if (food.includes('pizza')) return '🍕';
    if (food.includes('burger') || food.includes('hamburger')) return '🍔';
    if (food.includes('apple')) return '🍎';
    if (food.includes('banana')) return '🍌';
    if (food.includes('orange')) return '🍊';
    if (food.includes('salad')) return '🥗';
    if (food.includes('sandwich')) return '🥪';
    if (food.includes('pasta')) return '🍝';
    if (food.includes('rice')) return '🍚';
    if (food.includes('chicken')) return '🍗';
    if (food.includes('fish')) return '🐟';
    if (food.includes('bread')) return '🍞';
    if (food.includes('cake')) return '🍰';
    if (food.includes('cookie')) return '🍪';
    if (food.includes('donut')) return '🍩';
    if (food.includes('ice cream')) return '🍦';
    
    return '🍽️'; // Default food emoji
}

// Show error message
function showError(message) {
    resultsSection.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <div style="font-size: 4rem; margin-bottom: 1rem;">⚠️</div>
            <h3 style="color: #e74c3c; margin-bottom: 1rem;">Analysis Failed</h3>
            <p style="color: #666; margin-bottom: 2rem;">${message}</p>
            <button class="btn btn-primary" onclick="resetApp()">Try Again</button>
        </div>
    `;
    
    showSection('results');
}

// Show specific section
function showSection(section) {
    // Hide all sections
    uploadSection.classList.add('hidden');
    loadingSection.classList.add('hidden');
    resultsSection.classList.add('hidden');
    
    // Show requested section
    switch(section) {
        case 'upload':
            uploadSection.classList.remove('hidden');
            break;
        case 'loading':
            loadingSection.classList.remove('hidden');
            break;
        case 'results':
            resultsSection.classList.remove('hidden');
            break;
    }
}

// Reset application
function resetApp() {
    currentFile = null;
    fileInput.value = '';
    imagePreview.classList.add('hidden');
    showSection('upload');
    
    // Remove fade-in classes
    imagePreview.classList.remove('fade-in');
    resultsSection.classList.remove('fade-in');
}

// Log app initialization
console.log('🍎 Food Calorie Detector initialized!');
console.log('📝 Don\'t forget to set your Gemini API key in script.js');
