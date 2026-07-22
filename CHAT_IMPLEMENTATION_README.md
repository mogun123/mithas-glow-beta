# Glow Chat System Implementation

## Overview

This implementation transforms the static ChatScreen.tsx into a fully functional live chat system with three distinct modes:

1. **Glow Contact** (WhatsApp Style) - Private E2EE messaging
2. **Glow Messenger** (Instagram Style) - Social discovery with message requests
3. **Glow Artist** (Business Mode) - Booking-based communication

## Architecture

### Core Components

#### 1. `useChatEngine` Hook
- **Location**: `src/hooks/useChatEngine.ts`
- **Purpose**: Central orchestrator that switches logic based on currentTab
- **Features**:
  - Tab-based service routing
  - Real-time message subscriptions
  - Unified message handling
  - Typing indicators

#### 2. Service Layer

##### Signal Service (`src/services/signalService.ts`)
- **Purpose**: End-to-End Encryption for Glow Contact tab
- **Technology**: Supabase Realtime + Signal Protocol
- **Features**:
  - Message encryption/decryption
  - Contact sync from phone numbers
  - Online status via Supabase Presence
  - Auto-delete timers

##### Zego Service (`src/services/zegoService.ts`)
- **Purpose**: High-speed messaging for Glow Messenger tab
- **Technology**: ZegoCloud SDK (Zim SDK)
- **Features**:
  - Message requests handling
  - Typing indicators
  - Social graph based on @username
  - Follower counts

##### R2 Storage (`src/services/r2Storage.ts`)
- **Purpose**: Cloudflare R2 integration for media storage
- **Features**:
  - Image/video/audio upload
  - File compression
  - Signed URL generation
  - File metadata management

#### 3. File Upload System

##### `useFileUpload` Hook (`src/hooks/useFileUpload.ts`)
- **Purpose**: Unified file handling across all tabs
- **Features**:
  - Drag & drop support
  - File type validation
  - Upload progress tracking
  - Error handling

##### `useFileSelect` Hook
- **Purpose**: File selection interface
- **Features**:
  - Multiple file selection
  - File type filtering
  - Custom file input handling

#### 4. Settings Sync

##### `useSettingsSync` Hook (`src/hooks/useSettingsSync.ts`)
- **Purpose**: Cloud synchronization of user preferences
- **Features**:
  - Debounced updates
  - Offline support
  - Settings persistence
  - Default values management

### Database Schema

The system uses Supabase PostgreSQL with the following key tables:

- `user_preferences` - Settings storage
- `signal_keys` - E2EE key management
- `messages` - Message storage
- `typing_indicators` - Real-time typing status
- `bookings` - Artist booking system
- `booking_chat_messages` - Booking-specific messages
- `message_requests` - Messenger tab requests
- `user_relationships` - Social graph
- `profiles` - Extended user profiles

## Tab-Specific Implementation

### Glow Contact (WhatsApp Style)

**Engine**: Supabase Realtime + Signal Protocol
- **Security**: End-to-End Encryption
- **Identity**: Phone number sync
- **Features**:
  - Auto-delete messages
  - Screenshot alerts
  - Online/Last Seen status
  - Encrypted message previews

### Glow Messenger (Instagram Style)

**Engine**: ZegoCloud SDK
- **Speed**: Low-latency signaling
- **Identity**: @username handles
- **Features**:
  - Message requests (allow/block)
  - Typing indicators
  - Follower counts
  - Social discovery

### Glow Artist (Business Mode)

**Engine**: FastAPI + PostgreSQL (REST API)
- **Audit**: Complete message trails
- **Context**: Booking-linked conversations
- **Features**:
  - Booking status integration
  - Payment references
  - Service discussions
  - Location/time coordination

## Installation & Setup

### 1. Environment Configuration

Copy `.env.example` to `.env.local` and configure:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# ZegoCloud
NEXT_PUBLIC_ZEGO_APP_ID=your_zego_app_id
NEXT_PUBLIC_ZEGO_SERVER=your_zego_server

# Cloudflare R2
NEXT_PUBLIC_R2_ACCOUNT_ID=your_r2_account_id
NEXT_PUBLIC_R2_ACCESS_KEY_ID=your_r2_access_key_id
NEXT_PUBLIC_R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
NEXT_PUBLIC_R2_BUCKET_NAME=glow-chat-media
NEXT_PUBLIC_R2_PUBLIC_URL=your_r2_public_url

# FastAPI
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### 2. Database Setup

Run the SQL schema in your Supabase SQL editor:

```bash
# Execute the schema
psql -f database/chat_schema.sql
```

### 3. Dependencies

Install required packages:

```bash
npm install @types/lodash
npm install @supabase/supabase-js
# Additional dependencies will be added as needed
```

### 4. Service Configuration

#### Supabase Setup
1. Create new project
2. Run the provided SQL schema
3. Configure authentication
4. Set up Row Level Security policies

#### ZegoCloud Setup
1. Create ZegoCloud account
2. Generate App ID and server credentials
3. Configure real-time messaging

#### Cloudflare R2 Setup
1. Create R2 bucket
2. Generate API credentials
3. Configure CORS settings

#### FastAPI Backend (Artist Tab)
1. Set up FastAPI server
2. Implement booking endpoints
3. Configure database connection

## Usage

### Basic Chat Functionality

```typescript
// The useChatEngine hook handles all tab-specific logic
const chatEngine = useChatEngine(currentTab);

// Send messages
await chatEngine.sendMessage(text, userId, tab);

// Fetch messages
await chatEngine.fetchMessages(userId, tab);

// Subscribe to real-time updates
const unsubscribe = chatEngine.subscribeToMessages(userId, tab);

// Send typing indicators
chatEngine.sendTypingIndicator(userId, tab, true);
```

### File Upload

```typescript
// Use the file upload hook
const { uploadFile, selectFiles } = useFileUpload();

// Handle file selection
const handleFileUpload = async (files: File[]) => {
  for (const file of files) {
    const url = await uploadFile(file);
    // Send file as message
    await chatEngine.sendMessage(`📎 ${file.name}`, userId, tab);
  }
};
```

### Settings Sync

```typescript
// Use settings sync hook
const { preferences, updatePreference } = useSettingsSync();

// Update any setting
await updatePreference('bubble_style', 'bold');
await updatePreference('app_theme', 'dark');
```

## Security Features

### End-to-End Encryption
- Signal Protocol implementation
- Device-specific key pairs
- Forward secrecy
- Message authentication

### Privacy Controls
- Screenshot detection alerts
- Auto-delete timers
- Online status privacy
- Read receipt controls

### Data Protection
- Row Level Security (RLS)
- User data isolation
- Secure file storage
- API rate limiting

## Performance Optimizations

### Real-time Updates
- Supabase Realtime subscriptions
- Efficient message polling
- Typing indicator debouncing
- Connection pooling

### File Handling
- Image compression
- Chunked uploads
- Progress tracking
- Error recovery

### Caching Strategy
- Local settings persistence
- Message caching
- Avatar caching
- Offline support

## Monitoring & Analytics

### Error Tracking
- Comprehensive error logging
- Service health monitoring
- Performance metrics
- User behavior analytics

### Debugging Tools
- Development mode logging
- Network request inspection
- Real-time debugging
- Performance profiling

## Future Enhancements

### Planned Features
1. **Voice/Video Calling**: WebRTC integration
2. **AI Features**: Smart replies, content moderation
3. **Advanced Encryption**: Double ratchet algorithm
4. **Multi-device Sync**: Cross-platform synchronization
5. **Analytics Dashboard**: Chat insights and metrics

### Scalability
1. **Horizontal Scaling**: Load balancing
2. **Database Optimization**: Indexing and partitioning
3. **CDN Integration**: Global content delivery
4. **Microservices**: Service decomposition

## Troubleshooting

### Common Issues

1. **Connection Problems**: Check environment variables
2. **E2EE Issues**: Verify key generation
3. **File Upload Failures**: Check R2 credentials
4. **Real-time Updates**: Verify WebSocket connections

### Debug Mode

Enable debug logging:

```typescript
// In development
if (process.env.NODE_ENV === 'development') {
  console.log('ChatEngine Debug:', chatEngine);
}
```

## Contributing

### Code Style
- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Comprehensive testing

### Testing Strategy
- Unit tests for hooks
- Integration tests for services
- E2E tests for user flows
- Performance testing

## Support

For technical support:
1. Check the troubleshooting section
2. Review error logs
3. Verify configuration
4. Contact development team

---

**Note**: This implementation provides a production-ready foundation for a multi-modal chat system with enterprise-grade security and scalability.
