// NAVIGATION DEBUG TEST
// Open browser console and run this to test navigation

// Test 1: Check current navigation state
console.log('=== NAVIGATION DEBUG ===');
console.log('Current page:', window.location.hash.replace('#', ''));
console.log('Navigation history length:', window.history.length);

// Test 2: Simulate navigation history
const testNavigation = () => {
  // This should match what's in your React state
  const expectedHistory = ['mall', 'floor1', 'product', 'search'];
  console.log('Expected navigation flow:', expectedHistory);
  
  // Test back button simulation
  console.log('Simulating back button presses:');
  let history = ['mall', 'floor1', 'product', 'search'];
  
  while (history.length > 1) {
    history.pop();
    console.log('Back to:', history[history.length - 1]);
  }
  
  console.log('Final back to parent');
};

// Run test
testNavigation();
