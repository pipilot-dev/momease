// Simple Standalone Runnable JavaScript File
// Run with: node simple.js

console.log("Hello from MomEase Care Hub!");
console.log("This is a simple standalone JavaScript file.");

function greet(name) {
  return `Hello, ${name}! Welcome to MomEase.`;
}

// Example usage
const message = greet("User");
console.log(message);

// Simple array operations
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log("Original:", numbers);
console.log("Doubled:", doubled);

// Export for module usage (optional)
module.exports = { greet };