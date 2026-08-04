/**
 * Navigation Service
 * MITHAS GLOW - Centralized navigation management
 */

export type PageType = 
  | 'loading' 
  | 'mall' 
  | 'product' 
  | 'cart' 
  | 'orders' 
  | 'wishlist' 
  | 'creators'
  | 'seller-dashboard'
  | 'profile'
  | 'settings';

export interface NavigationState {
  currentPage: PageType;
  previousPage: PageType | null;
  navigationHistory: PageType[];
}

class NavigationService {
  private state: NavigationState = {
    currentPage: 'loading',
    previousPage: null,
    navigationHistory: []
  };

  private listeners: ((state: NavigationState) => void)[] = [];

  // Subscribe to navigation changes
  subscribe(listener: (state: NavigationState) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Notify all listeners
  private notify() {
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  // Navigate to a new page
  navigate(page: PageType, addToHistory = true) {
    this.state.previousPage = this.state.currentPage;
    this.state.currentPage = page;
    
    if (addToHistory) {
      this.state.navigationHistory.push(page);
      // Keep only last 10 pages in history
      if (this.state.navigationHistory.length > 10) {
        this.state.navigationHistory.shift();
      }
    }
    
    this.notify();
  }

  // Go back to previous page
  goBack() {
    if (this.state.previousPage) {
      const previous = this.state.previousPage;
      this.state.previousPage = null;
      this.navigate(previous, false);
    }
  }

  // Get current state
  getState(): NavigationState {
    return { ...this.state };
  }

  // Check if can go back
  canGoBack(): boolean {
    return this.state.previousPage !== null;
  }

  // Reset navigation
  reset() {
    this.state = {
      currentPage: 'loading',
      previousPage: null,
      navigationHistory: []
    };
    this.notify();
  }
}

export const navigationService = new NavigationService();
export default navigationService;
