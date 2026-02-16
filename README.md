# 🎬 Cine-Verse

**Cine-Verse** is a modern, feature-rich movie discovery application built with **React Native (Expo)**. It helps users explore trending movies, search for their favorites, view detailed information, and find where to stream content.

The app features a sleek, dark-themed UI powered by **NativeWind**, robust state management with **React Query**, and seamless backend integration using **Appwrite** and **Clerk**.

## ✨ Features

- **🔥 Trending Movies**: Browse the latest and most popular movies updated in real-time.
- **🔍 Search Functionality**: Powerful search to find movies by title.
- **📄 Detailed Insights**: View movie overviews, cast, crew, ratings, and runtime.
- **📺 Streaming Availability**: innovative "Where to Watch" feature showing streaming services (Netflix, Prime, etc.) specific to your region (powered by Watchmode).
- **🔖 Watchlist**: Save your favorite movies to your personal watchlist (synced via Appwrite).
- **🔐 User Authentication**: Secure sign-up and sign-in flow using Clerk.
- **🎨 Modern UI**: Beautiful dark mode interface with smooth animations and gradients.

## 🛠️ Tech Stack

- **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [NativeWind](https://www.nativewind.dev/) (Tailwind CSS for React Native)
- **State Management**: [TanStack Query](https://tanstack.com/query/latest) (React Query)
- **Authentication**: [Clerk](https://clerk.com/)
- **Backend / Database**: [Appwrite](https://appwrite.io/)
- **APIs**:
  - [TMDB (The Movie Database)](https://www.themoviedb.org/) for movie data.
  - [Watchmode](https://www.watchmode.com/) for streaming availability.

## 🚀 Getting Started

Follow these steps to set up and run the project locally.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Expo Go](https://expo.dev/client) app on your iOS/Android device (or an emulator).

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/cine-verse.git
    cd cine-verse
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Environment Setup:**

    Create a `.env` file in the root directory and add your API keys:

    ```env
    EXPO_PUBLIC_Appwrite_PROJECT_ID=your_appwrite_project_id
    EXPO_PUBLIC_APPWRITE_PROJECT_NAME=your_project_name
    EXPO_PUBLIC_APPWRITE_ENDPOINT=your_appwrite_endpoint
    EXPO_PUBLIC_APPWRITE_DATABASE_ID=your_database_id
    EXPO_PUBLIC_APPWRITE_COLLECTION_ID=your_collection_id
    
    EXPO_PUBLIC_MOVIE_API_KEY=your_tmdb_api_key
    EXPO_PUBLIC_WATCH_MODE_API_KEY=your_watchmode_api_key
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
    ```

### Running the App

Start the development server:

```bash
npx expo start
```

- **Scan the QR code** with the Expo Go app (Android) or Camera app (iOS).
- Press `a` to open in an **Android Emulator**.
- Press `i` to open in an **iOS Simulator**.
- Press `w` to open in the **Web Browser**.

## 📂 Project Structure

```
cine-verse/
├── app/                  # Expo Router pages and layouts
│   ├── (auth)/           # Authentication screens
│   ├── (tabs)/           # Main tab navigation (Home, Search, Profile)
│   ├── movies/           # Movie detail pages
│   └── _layout.tsx       # Root layout provider
├── components/           # Reusable UI components (MovieCard, SearchBar, etc.)
├── services/             # API services (TMDB, Watchmode, Appwrite)
├── constants/            # App constants (icons, images, themes)
├── assets/               # Static assets (images, fonts)
└── ...
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
