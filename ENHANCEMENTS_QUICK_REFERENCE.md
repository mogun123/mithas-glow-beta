# Enhancements Quick Reference

## 1. Loading Skeletons - Import & Use

```tsx
import { 
  ProductCardSkeleton,
  CartItemSkeleton,
  ProductDetailSkeleton,
  PageHeaderSkeleton
} from '@/components/ui/skeleton'

// Product card loading
{isLoading && <ProductCardSkeleton />}

// Cart item loading
{isLoading && <CartItemSkeleton />}

// Product detail loading
{isLoading && <ProductDetailSkeleton />}

// Page header loading
{isLoading && <PageHeaderSkeleton />}
```

## 2. Micro-Interactions - 12 Effects

```tsx
import { 
  HoverScale,      // Button-like scale up
  HoverLift,       // Card lift on hover
  ButtonPress,     // Button press down
  Pulse,           // Attention pulse
  Wiggle,          // Error wiggle
  Bounce,          // Success bounce
  Glow,            // Premium glow
  Rotate,          // Loading spinner
  Flip,            // Card flip
  Shimmer,         // Loading shimmer
  Stagger          // List animation
} from '@/components/interactions/micro-interactions'

// Examples
<HoverScale><Button /></HoverScale>
<HoverLift><Card /></HoverLift>
<Pulse><Featured /></Pulse>
<Wiggle trigger={hasError}><Input /></Wiggle>
<Bounce trigger={success}><Success /></Bounce>
```

## 3. Page Transitions

```tsx
import {
  PageTransition,
  SectionTransition,
  FadeIn,
  SlideIn,
  ScaleIn
} from '@/components/transitions/page-transition'

// Full page transition
<PageTransition>
  <Page content here />
</PageTransition>

// Section transition on scroll
<SectionTransition delay={0.2}>
  <Section />
</SectionTransition>

// Fade in
<FadeIn>
  <Component />
</FadeIn>

// Slide in (left, right, up, down)
<SlideIn direction="left">
  <Component />
</SlideIn>

// Scale in (modal/dialog)
<ScaleIn>
  <Modal />
</ScaleIn>
```

## 4. Toast Notifications

```tsx
import { toast } from 'sonner'

// Success
toast.success('Item added to cart')
toast.success('Saved!', { description: 'Your changes have been saved' })

// Error
toast.error('Failed to add item')

// Loading
toast.loading('Saving...')

// Warning
toast.warning('Low stock')

// Info
toast.info('New items available')
```

---

## Common Implementation Patterns

### Shop Page
```tsx
const [products, setProducts] = useState([])
const [isLoading, setIsLoading] = useState(true)

return (
  <PageTransition>
    <div className="grid grid-cols-4 gap-4">
      {isLoading ? (
        Array(8).fill(null).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))
      ) : (
        products.map(p => (
          <HoverLift key={p.id}>
            <ProductCard product={p} />
          </HoverLift>
        ))
      )}
    </div>
  </PageTransition>
)
```

### Cart Page
```tsx
return (
  <PageTransition>
    {isLoading ? (
      Array(3).fill(null).map((_, i) => (
        <CartItemSkeleton key={i} />
      ))
    ) : (
      items.map(item => (
        <Wiggle key={item.id} trigger={errors[item.id]}>
          <CartItem item={item} />
        </Wiggle>
      ))
    )}
  </PageTransition>
)
```

### Form Submission
```tsx
const handleSubmit = async (data) => {
  toast.loading('Submitting...')
  try {
    await api.post('/submit', data)
    toast.success('Success!')
  } catch (error) {
    toast.error('Failed to submit')
  }
}
```

### Add to Cart
```tsx
const handleAddToCart = async (product) => {
  try {
    await cart.add(product)
    toast.success('Added to cart', {
      description: `${product.name} added`
    })
  } catch (error) {
    toast.error('Failed to add to cart')
  }
}
```

---

## File Locations

| Component | Path |
|-----------|------|
| Skeleton Loaders | `components/ui/skeleton.tsx` |
| Micro-Interactions | `components/interactions/micro-interactions.tsx` |
| Page Transitions | `components/transitions/page-transition.tsx` |
| Toast Hook | `hooks/use-toast.ts` |
| Loading Hook | `hooks/use-loading.ts` |

---

## Dependencies

- ✅ Sonner (already installed)
- ⚠️ Framer Motion (needs installation if not present)
- ✅ Zustand (for loading state management)

### Install Framer Motion (if needed)
```bash
npm install framer-motion
```

---

## Performance Tips

- Skeleton animations are subtle (pulse, not flashy)
- Micro-interactions are fast (200-300ms)
- Page transitions are smooth (300-400ms)
- Toasts auto-dismiss or manual close
- All effects use GPU acceleration
- Mobile performance optimized

---

## Accessibility

- All animations respect `prefers-reduced-motion`
- Toasts are dismissable
- Loading states are clear
- No motion blocks interaction
- Focus states maintained

---

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (iOS 13+)
- Mobile: Optimized for all devices

