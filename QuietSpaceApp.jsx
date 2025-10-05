import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    signInAnonymously,
    signInWithCustomToken,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
} from 'firebase/auth';
import {
    getFirestore,
    doc,
    setDoc,
    onSnapshot,
    collection,
    setLogLevel,
} from 'firebase/firestore';

// --- Configuration and Constants ---
// Global Variables (Provided by Canvas Environment)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Firestore Path Constants
const PRIVATE_COLLECTION_NAME = 'user_data'; 
const LOCATIONS_COLLECTION_NAME = 'quiet_locations'; // Public, simulated location data
const USER_DATA_DOCUMENT_ID = 'state';

// Translations
const translations = {
    en: {
        appName: "QuietSpace", home: "Home", profile: "Profile", myPlaces: "My Places", signIn: "Sign In", signOut: "Sign Out", welcome: "Welcome",
        noiseMap: "Noise Map", explore: "Explore", favorites: "Favorites", bookSpot: "Book Spot", bookingStatus: "Active Booking", cancelBooking: "Cancel Booking",
        noBooking: "You currently have no active booking.", placeName: "Place Name", dbMessage: "Database Message", placesTracker: "Ethiopian Places Tracker",
        addPlace: "Add Place", noPlaces: "No places added yet. Add your first one!", enterPlace: "Enter new place name...", connected: "Connected", authenticating: "Authenticating...",
        trackerTitle: "Your Saved Quiet Spots", bookingSuccess: "Spot successfully booked!", bookingCanceled: "Booking successfully canceled.", delete: "Delete",
        homeTitle: "Nearby Quiet Spots", type: "Type", library: "Library", cafe: "Café", park: "Park", coworking: "Co-working", amenities: "Amenities", wifi: "Wi-Fi", outlets: "Outlets",
        dB: "dB", added: "Added",
    },
    fr: {
        appName: "Espace Tranquille", home: "Accueil", profile: "Profil", myPlaces: "Mes Lieux", signIn: "Se Connecter", signOut: "Se Déconnecter", welcome: "Bienvenue",
        noiseMap: "Carte Sonore", explore: "Explorer", favorites: "Favoris", bookSpot: "Réserver", bookingStatus: "Réservation Active", cancelBooking: "Annuler",
        noBooking: "Vous n'avez pas de réservation active.", placeName: "Nom du Lieu", dbMessage: "Message de la base de données", placesTracker: "Suivi des Lieux Éthiopiens",
        addPlace: "Ajouter un Lieu", noPlaces: "Aucun lieu ajouté pour l'instant !", enterPlace: "Entrez le nom d'un nouveau lieu...", connected: "Connecté", authenticating: "Authentification...",
        trackerTitle: "Vos Lieux Calmes Enregistrés", bookingSuccess: "Lieu réservé avec succès !", bookingCanceled: "Réservation annulée avec succès.", delete: "Supprimer",
        homeTitle: "Lieux Calmes Proches", type: "Type", library: "Bibliothèque", cafe: "Café", park: "Parc", coworking: "Espace Co-travail", amenities: "Commodités", wifi: "Wi-Fi", outlets: "Prises",
        dB: "dB", added: "Ajouté",
    },
    am: {
        appName: "ጸጥታ ቦታ", home: "ዋና ገጽ", profile: "መገለጫ", myPlaces: "የኔ ቦታዎች", signIn: "ይግቡ", signOut: "ይውጡ", welcome: "እንኳን ደህና መጡ",
        noiseMap: "የድምጽ ካርታ", explore: "አሰስ", favorites: "ተመራጮች", bookSpot: "ቦታ ይያዙ", bookingStatus: "የተያዘ ቦታ", cancelBooking: "ቦታ መሰረዝ",
        noBooking: "በአሁኑ ሰዓት የተያዘ ቦታ የለዎትም።", placeName: "የቦታው ስም", dbMessage: "የዳታቤዝ መልእክት", placesTracker: "የኢትዮጵያ ቦታዎች መከታተያ",
        addPlace: "ቦታ ያክሉ", noPlaces: "እስካሁን ምንም ቦታ አልተጨመረም! የመጀመሪያውን ያክሉ", enterPlace: "አዲስ ቦታ ስም ያስገቡ...", connected: "ተገናኝቷል", authenticating: "በማረጋገጥ ላይ...",
        trackerTitle: "የተቀመጡ ጸጥ ያሉ ቦታዎችዎ", bookingSuccess: "ቦታ በተሳካ ሁኔታ ተይዟል!", bookingCanceled: "ቦታው በተሳካ ሁኔታ ተሰርዟል።", delete: "አጥፋ",
        homeTitle: "አቅራቢያ ያሉ ጸጥ ያሉ ቦታዎች", type: "ዓይነት", library: "ቤተ-መጻሕፍት", cafe: "ካፌ", park: "ፓርክ", coworking: "የጋራ መሥሪያ ቦታ", amenities: "መገልገያዎች", wifi: "ዋይፋይ", outlets: "መውጫ",
        dB: "ዲቢ", added: "ተጨምሯል",
    },
    nl: {
        appName: "StilteRuimte", home: "Start", profile: "Profiel", myPlaces: "Mijn Plekken", signIn: "Inloggen", signOut: "Uitloggen", welcome: "Welkom",
        noiseMap: "Geluidskaart", explore: "Verken", favorites: "Favorieten", bookSpot: "Boek Plek", bookingStatus: "Actieve Boeking", cancelBooking: "Boeking Annuleren",
        noBooking: "U heeft momenteel geen actieve boeking.", placeName: "Naam van de Locatie", dbMessage: "Database Bericht", placesTracker: "Ethiopische Plekken Volger",
        addPlace: "Plek Toevoegen", noPlaces: "Nog geen plekken toegevoegd. Voeg uw eerste toe!", enterPlace: "Voer nieuwe pleknaam in...", connected: "Verbonden", authenticating: "Authenticeren...",
        trackerTitle: "Opgeslagen Stille Plekken", bookingSuccess: "Plek succesvol geboekt!", bookingCanceled: "Boeking succesvol geannuleerd.", delete: "Verwijderen",
        homeTitle: "Rustige Plekken in de Buurt", type: "Type", library: "Bibliotheek", cafe: "Café", park: "Park", coworking: "Co-werkplek", amenities: "Voorzieningen", wifi: "Wi-Fi", outlets: "Stopcontacten",
        dB: "dB", added: "Toegevoegd",
    },
};

// Mock Data for the Home Page
const MOCK_LOCATIONS = [
    // Global/Example Locations
    { id: 'lib001', name: 'Central City Library', type: 'Library', noiseLevel: 45, amenities: ['wifi', 'outlets'] },
    { id: 'park002', name: 'Riverside Quiet Zone', type: 'Park', noiseLevel: 32, amenities: [] },
    { id: 'cafe003', name: 'The Silent Sip Café', type: 'Café', noiseLevel: 55, amenities: ['wifi'] },
    { id: 'cowork004', name: 'Zen Desk Co-working', type: 'Co-working', noiseLevel: 40, amenities: ['wifi', 'outlets'] },
    { id: 'lib005', name: 'University Reading Hall', type: 'Library', noiseLevel: 50, amenities: ['outlets'] },
    { id: 'cafe006', name: 'Busy Bee Coffee', type: 'Café', noiseLevel: 68, amenities: ['wifi'] },
    // New Ethiopian Locations: Outdoor, Nature, Libraries
    { id: 'et_lib1', name: 'Abrehot Library', type: 'Library', noiseLevel: 45, amenities: ['wifi', 'outlets'] },
    { id: 'et_park1', name: 'Sheger Park', type: 'Park', noiseLevel: 35, amenities: [] },
    { id: 'et_park2', name: 'Entoto Natural Park', type: 'Park', noiseLevel: 30, amenities: [] },
];

// --- Main App Component ---
const App = () => {
    // 1. Firebase State
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [user, setUser] = useState(null); // Full user object for profile details
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [loading, setLoading] = useState(true);

    // 2. App State
    const [appData, setAppData] = useState({ bookingId: null, bookingPlace: null, places: [] });
    const [currentPage, setCurrentPage] = useState('Home');
    const [language, setLanguage] = useState('en');
    const [toastMessage, setToastMessage] = useState(null);
    const [inputPlace, setInputPlace] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [filterAmenities, setFilterAmenities] = useState([]);
    
    const t = translations[language]; // Get current translations

    // --- Utility Functions ---

    const showToast = (message, type = 'success') => {
        setToastMessage({ message, type });
        setTimeout(() => setToastMessage(null), 3000);
    };

    const getDocRef = useCallback(() => {
        if (!db || !userId) return null;
        // Path: /artifacts/{appId}/users/{userId}/user_data/state
        const userDataCollection = collection(db, 'artifacts', appId, 'users', userId, PRIVATE_COLLECTION_NAME);
        return doc(userDataCollection, USER_DATA_DOCUMENT_ID);
    }, [db, userId]);

    // --- FIREBASE EFFECTS & LOGIC ---

    // Effect 1: Initialize Firebase and Handle Authentication
    useEffect(() => {
        try {
            setLogLevel('Debug');
            const firebaseApp = initializeApp(firebaseConfig);
            const firestoreDb = getFirestore(firebaseApp);
            const firebaseAuth = getAuth(firebaseApp);

            setDb(firestoreDb);
            setAuth(firebaseAuth);

            const unsubscribe = onAuthStateChanged(firebaseAuth, async (currentUser) => {
                if (currentUser) {
                    setUser(currentUser);
                    setUserId(currentUser.uid);
                } else {
                    try {
                        if (initialAuthToken) {
                            await signInWithCustomToken(firebaseAuth, initialAuthToken);
                        } else {
                            await signInAnonymously(firebaseAuth);
                        }
                    } catch (authError) {
                        console.error('Initial Auth Error:', authError);
                    }
                    // Re-run listener to capture the user object from anonymous sign-in
                }
                setIsAuthReady(true);
                setLoading(false);
            });

            return () => unsubscribe();
        } catch (initError) {
            console.error('Firebase Init Error:', initError);
            setLoading(false);
        }
    }, []);

    // Effect 2: Set up Real-time Data Listener for User State
    useEffect(() => {
        if (!db || !isAuthReady || !userId) return;

        const docRef = getDocRef();
        if (!docRef) return;

        let unsubscribeSnapshot = () => {};

        try {
            unsubscribeSnapshot = onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setAppData({ 
                        bookingId: data.bookingId || null, 
                        bookingPlace: data.bookingPlace || null,
                        places: data.places || [] 
                    });
                } else {
                    // Initialize the document if it doesn't exist
                    setDoc(docRef, appData, { merge: true })
                        .catch(e => console.error('Error setting initial user doc:', e));
                }
            }, (snapshotError) => {
                console.error('Firestore Snapshot Error:', snapshotError);
            });
        } catch (e) {
            console.error("Failed to attach snapshot listener:", e);
        }

        return () => unsubscribeSnapshot();
    }, [db, userId, isAuthReady, getDocRef]);


    // --- AUTHENTICATION HANDLERS ---

    const handleGoogleSignIn = async () => {
        if (!auth) return;
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            showToast(t.welcome + "!", 'success');
        } catch (error) {
            console.error("Google Sign-In Error:", error);
            showToast("Sign-In failed.", 'error');
        }
    };

    const handleSignOut = async () => {
        if (!auth) return;
        try {
            await signOut(auth);
            setUser(null);
            setUserId(null);
            showToast(t.signOut + " complete.", 'success');
        } catch (error) {
            console.error("Sign-Out Error:", error);
            showToast("Sign-Out failed.", 'error');
        }
    };

    // --- APPLICATION LOGIC ---

    const handleBooking = async (locationId, locationName) => {
        if (!userId || !db) return;
        
        const docRef = getDocRef();
        if (!docRef) return;
        
        try {
            const newBooking = locationId ? { bookingId: locationId, bookingPlace: locationName } : { bookingId: null, bookingPlace: null };
            await setDoc(docRef, newBooking, { merge: true });
            
            if (locationId) {
                 showToast(t.bookingSuccess, 'success');
            } else {
                showToast(t.bookingCanceled, 'success');
            }
        } catch (e) {
            console.error('Booking error:', e);
            showToast("Booking failed.", 'error');
        }
    };

    // Add a new Place to the Array
    const handleSavePlace = async () => {
        if (!db || !userId) return showToast("Please sign in to add places.", 'warning');
        const placeName = inputPlace.trim();
        if (!placeName) return;

        const docRef = getDocRef();
        if (!docRef) return;

        try {
            const currentPlaces = appData.places || [];
            const newPlace = {
                id: Date.now(),
                name: placeName,
                addedAt: new Date().toISOString(),
            };
            const newPlacesArray = [...currentPlaces, newPlace];
            
            await setDoc(docRef, { places: newPlacesArray }, { merge: true });
            setInputPlace('');
            showToast(`"${placeName}" added!`, 'success');
        } catch (e) {
            console.error('Firestore Write Error:', e);
            showToast("Failed to save place.", 'error');
        }
    };
    
    // Delete a Place from the Array
    const handleDeletePlace = async (placeId, placeName) => {
        if (!db || !userId) return;

        const docRef = getDocRef();
        if (!docRef) return;

        try {
            const currentPlaces = appData.places || [];
            const newPlacesArray = currentPlaces.filter(place => place.id !== placeId);
            
            await setDoc(docRef, { places: newPlacesArray }, { merge: true });
            showToast(`"${placeName}" deleted.`, 'success');
        } catch (e) {
            console.error('Failed to delete place:', e);
            showToast("Failed to delete place.", 'error');
        }
    };

    const toggleAmenityFilter = (amenity) => {
        setFilterAmenities(prev =>
            prev.includes(amenity)
                ? prev.filter(a => a !== amenity)
                : [...prev, amenity]
        );
    };

    const getNoiseColor = (dB) => {
        if (dB <= 40) return 'bg-green-500'; // Quiet (Park, Library)
        if (dB <= 55) return 'bg-yellow-500'; // Moderate (Cafe, Co-work)
        return 'bg-red-500'; // Loud (Needs avoidance)
    };
    
    // --- UI COMPONENTS ---

    const StatusIndicator = ({ status, className = '' }) => (
        <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium ${className}`}>
            <svg className="-ml-1 mr-1.5 h-2 w-2" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" /></svg>
            {status}
        </span>
    );

    const ProfileAvatar = () => {
        if (loading || !user) return <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>;
        
        const nameInitial = user.displayName ? user.displayName[0] : (user.email ? user.email[0] : '?');
        
        return (
            <div className="relative group">
                <div className="w-10 h-10 bg-indigo-500 text-white font-bold text-lg rounded-full flex items-center justify-center cursor-pointer shadow-lg">
                    {nameInitial.toUpperCase()}
                </div>
                {/* Profile Dropdown Card */}
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto">
                    <p className="text-xl font-bold text-gray-800 truncate">{user.displayName || 'Anonymous User'}</p>
                    <p className="text-sm text-gray-500 mb-4 truncate">{user.email || 'N/A'}</p>
                    <button 
                        onClick={handleSignOut}
                        className="w-full py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition"
                    >
                        {t.signOut}
                    </button>
                </div>
            </div>
        );
    };

    // --- PAGE RENDERING ---

    const renderHomePage = () => {
        const filteredLocations = MOCK_LOCATIONS.filter(location => {
            const typeMatch = filterType === 'All' || location.type === filterType;
            const amenityMatch = filterAmenities.every(amenity => location.amenities.includes(amenity));
            return typeMatch && amenityMatch;
        });

        return (
            <div className="p-4 pb-20">
                <h2 className="text-3xl font-extrabold text-gray-800 mb-6">{t.homeTitle}</h2>
                
                {/* Booking Status */}
                {user && (
                    <div className={`p-4 rounded-xl shadow-lg mb-6 ${appData.bookingId ? 'bg-indigo-50 border border-indigo-200' : 'bg-gray-100 border border-gray-200'}`}>
                        <h3 className="text-xl font-bold text-gray-700 mb-2">{t.bookingStatus}</h3>
                        {appData.bookingId ? (
                            <div className="flex justify-between items-center">
                                <p className="text-lg font-semibold text-indigo-600 truncate">{appData.bookingPlace}</p>
                                <button 
                                    onClick={() => handleBooking(null, null)}
                                    className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition text-sm"
                                >
                                    {t.cancelBooking}
                                </button>
                            </div>
                        ) : (
                            <p className="text-gray-500">{t.noBooking}</p>
                        )}
                    </div>
                )}
                
                {/* Filters */}
                <div className="bg-white p-4 rounded-xl shadow-md mb-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">{t.type}</h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {['All', 'Library', 'Café', 'Park', 'Co-working'].map(type => (
                            <button 
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-4 py-2 text-sm font-medium rounded-full transition ${filterType === type ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-indigo-100'}`}
                            >
                                {t[type.toLowerCase()] || type}
                            </button>
                        ))}
                    </div>

                    <h3 className="text-lg font-semibold text-gray-700 mb-3">{t.amenities}</h3>
                    <div className="flex flex-wrap gap-2">
                        {['wifi', 'outlets'].map(amenity => (
                            <button 
                                key={amenity}
                                onClick={() => toggleAmenityFilter(amenity)}
                                className={`px-4 py-2 text-sm font-medium rounded-full transition ${filterAmenities.includes(amenity) ? 'bg-green-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-green-100'}`}
                            >
                                {t[amenity]}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Locations List */}
                <div className="space-y-4">
                    {filteredLocations.length > 0 ? (
                        filteredLocations.map(loc => (
                            <div key={loc.id} className="bg-white p-4 rounded-xl shadow-lg flex justify-between items-center border-l-4 border-indigo-400 hover:shadow-xl transition">
                                <div>
                                    <p className="text-xl font-bold text-gray-800">{loc.name}</p>
                                    <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                                        <span className={`px-2 py-0.5 rounded-full text-white text-xs font-semibold ${getNoiseColor(loc.noiseLevel)}`}>
                                            {loc.noiseLevel} {t.dB}
                                        </span>
                                        {loc.amenities.map(a => <span key={a} className="text-xs px-2 py-0.5 bg-gray-100 rounded-full">{t[a]}</span>)}
                                    </div>
                                </div>
                                
                                {user ? (
                                    <button 
                                        onClick={() => handleBooking(loc.id, loc.name)}
                                        disabled={!!appData.bookingId}
                                        className="px-4 py-2 bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed text-sm shadow-md"
                                    >
                                        {appData.bookingId ? (appData.bookingPlace === loc.name ? "Booked" : t.bookSpot) : t.bookSpot}
                                    </button>
                                ) : (
                                    <button 
                                        onClick={handleGoogleSignIn}
                                        className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition text-sm shadow-md"
                                    >
                                        {t.signIn}
                                    </button>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className="text-center py-8 text-gray-500 italic">No locations match your current filters.</p>
                    )}
                </div>
            </div>
        );
    };

    const renderMyPlacesPage = () => (
        <div className="p-4 pb-20">
            <h2 className="text-3xl font-extrabold text-gray-800 mb-6">{t.placesTracker}</h2>
            
            {/* Add New Place Input */}
            {user ? (
                <div className="bg-white shadow-xl rounded-xl p-6 border border-gray-200 mb-8">
                    <h3 className="text-xl font-medium text-gray-800 mb-4">{t.addPlace}</h3>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            className="flex-grow p-3 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                            value={inputPlace}
                            onChange={(e) => setInputPlace(e.target.value)}
                            placeholder={t.enterPlace}
                            disabled={loading}
                        />
                        <button
                            onClick={handleSavePlace}
                            disabled={loading || !inputPlace.trim()}
                            className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition duration-150 disabled:opacity-50"
                        >
                            {t.addPlace}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="text-center bg-gray-100 p-6 rounded-xl shadow-inner mb-8">
                    <p className="text-lg text-gray-700 mb-4">Please sign in to save and manage your personal quiet spots.</p>
                    <button 
                        onClick={handleGoogleSignIn}
                        className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition shadow-md"
                    >
                        {t.signIn}
                    </button>
                </div>
            )}


            {/* List Display */}
            <div className="bg-white shadow-xl rounded-xl p-6 border border-gray-200">
                <h3 className="text-2xl font-semibold text-gray-800 mb-4">{t.trackerTitle}</h3>
                {appData.places && appData.places.length > 0 ? (
                    <ul className="space-y-3 border border-gray-100 bg-gray-50 p-4 rounded-lg">
                        {appData.places.map((place) => (
                            <li key={place.id} className="flex justify-between items-center p-3 bg-white rounded-md shadow-sm text-gray-800 border-l-4 border-purple-400">
                                <span className="font-medium text-lg truncate">{place.name}</span>
                                <div className="flex items-center space-x-3">
                                    <span className="text-xs text-gray-400 hidden sm:block">
                                        {t.added}: {new Date(place.addedAt).toLocaleTimeString()}
                                    </span>
                                    <button
                                        onClick={() => handleDeletePlace(place.id, place.name)}
                                        className="p-1 text-red-500 hover:text-red-700 transition duration-150 rounded-full hover:bg-red-50 disabled:opacity-50"
                                        disabled={loading || !user}
                                        aria-label={t.delete}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                            <path fillRule="evenodd" d="M16.5 4.478a.75.75 0 0 0-.671-.75L12 3.992l-3.829-.264a.75.75 0 0 0-.671.75l.135 1.576a.75.75 0 0 0 .749.664h7.371a.75.75 0 0 0 .749-.664l.135-1.576Z" clipRule="evenodd" />
                                            <path d="M4.093 18.775a.75.75 0 0 0 .198.544l.872.872c.157.157.348.26.549.26h11.236c.201 0 .392-.103.55-.26l.871-.872a.75.75 0 0 0 .198-.544l.321-3.535a.75.75 0 0 0-.749-.785H4.521a.75.75 0 0 0-.75.785l.322 3.535Z" />
                                            <path fillRule="evenodd" d="M11 20.25a.75.75 0 0 0 1.5 0V7.5a.75.75 0 0 0-1.5 0v12.75ZM8.625 20.25a.75.75 0 0 0 1.5 0V7.5a.75.75 0 0 0-1.5 0v12.75ZM13.875 20.25a.75.75 0 0 0 1.5 0V7.5a.75.75 0 0 0-1.5 0v12.75Z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500 italic p-4 bg-gray-50 rounded-lg">{t.noPlaces}</p>
                )}
            </div>
        </div>
    );
    
    const renderProfilePage = () => (
        <div className="p-4 pb-20">
            <h2 className="text-3xl font-extrabold text-gray-800 mb-6">{t.profile}</h2>
            
            {user ? (
                <div className="bg-white shadow-xl rounded-xl p-6 border border-gray-200 space-y-4">
                    <p className="text-gray-500 text-lg">{t.welcome}, <span className="font-semibold text-indigo-600">{user.displayName || 'Friend'}</span>!</p>
                    <div className="border-t pt-4 space-y-2">
                        <p className="text-sm font-medium text-gray-600">Email:</p>
                        <p className="text-lg font-mono break-all">{user.email || 'N/A'}</p>
                        <p className="text-sm font-medium text-gray-600">User ID (for private data):</p>
                        <p className="text-lg font-mono break-all text-red-600">{userId}</p>
                    </div>
                    <button onClick={handleSignOut} className="w-full py-3 mt-4 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition shadow-md">
                        {t.signOut}
                    </button>
                </div>
            ) : (
                <div className="text-center bg-white p-8 rounded-xl shadow-xl">
                    <p className="text-xl font-semibold text-gray-700 mb-4">You are currently signed out.</p>
                    <button onClick={handleGoogleSignIn} className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition shadow-md">
                        {t.signIn} with Google
                    </button>
                </div>
            )}
            
             {/* Connection Status */}
             <div className="bg-white shadow-xl rounded-xl p-6 mt-8 border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Connection Status</h2>
                <div className="flex items-center justify-between">
                    <span className="text-gray-600">Database Status:</span>
                    {db ? (
                        <StatusIndicator status={t.connected} className="bg-green-100 text-green-800" />
                    ) : (
                        <StatusIndicator status={t.authenticating} className="bg-yellow-100 text-yellow-800" />
                    )}
                </div>
            </div>
        </div>
    );
    
    const renderContent = () => {
        if (loading || !isAuthReady) {
            return (
                <div className="flex justify-center items-center h-96">
                    <div className="text-center">
                        <svg className="animate-spin h-8 w-8 text-indigo-500 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-gray-600">Loading {t.appName}...</p>
                    </div>
                </div>
            );
        }

        switch (currentPage) {
            case 'Home':
                return renderHomePage();
            case 'My Places':
                return renderMyPlacesPage();
            case 'Profile':
                return renderProfilePage();
            default:
                return renderHomePage();
        }
    };

    const navItems = [
        { name: 'Home', icon: (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.95-8.95c.29-.29.77-.29 1.06 0l8.95 8.95M2.25 12V19.5c0 .414.336.75.75.75h3v-6h4.5v6h3c.414 0 .75-.336.75-.75V12M12 18.75V12" /></svg>) },
        { name: 'My Places', icon: (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15h2.25a.75.75 0 0 1 0 1.5H9v4.5a.75.75 0 0 1-1.5 0v-4.5h-1.5a.75.75 0 0 1 0-1.5H7.5V6.75A.75.75 0 0 1 8.25 6h1.5a.75.75 0 0 1 .75.75Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12.75 6.75v12a.75.75 0 0 0 1.5 0V6.75a.75.75 0 0 0-1.5 0ZM16.5 6.75v12a.75.75 0 0 0 1.5 0V6.75a.75.75 0 0 0-1.5 0Z" /></svg>) },
        { name: 'Profile', icon: (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 18a9.75 9.75 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.611Z" /></svg>) },
    ];


    return (
        <div className="min-h-screen bg-gray-50 font-inter">
            <script src="https://cdn.tailwindcss.com"></script>

            {/* Header / Nav */}
            <header className="fixed top-0 left-0 right-0 bg-white shadow-md z-10">
                <div className="max-w-4xl mx-auto flex justify-between items-center p-4">
                    <h1 className="text-2xl font-black text-indigo-600">{t.appName}</h1>
                    <div className="flex items-center space-x-4">
                         <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="p-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="en">English</option>
                            <option value="fr">Français</option>
                            <option value="am">አማርኛ</option>
                            <option value="nl">Nederlands</option>
                        </select>
                        {user ? (
                            <ProfileAvatar />
                        ) : (
                            <button 
                                onClick={handleGoogleSignIn}
                                className="px-4 py-2 bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-600 transition text-sm hidden sm:block shadow-md"
                            >
                                {t.signIn}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="max-w-4xl mx-auto pt-20">
                {renderContent()}
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-2xl border-t border-gray-200 z-50 sm:hidden">
                <div className="flex justify-around items-center h-16">
                    {navItems.map(item => (
                        <button
                            key={item.name}
                            onClick={() => setCurrentPage(item.name)}
                            className={`flex flex-col items-center justify-center p-2 transition ${currentPage === item.name ? 'text-indigo-600' : 'text-gray-500 hover:text-indigo-400'}`}
                        >
                            <span className="w-6 h-6">{item.icon}</span>
                            <span className="text-xs font-medium mt-1">{t[item.name.toLowerCase()]}</span>
                        </button>
                    ))}
                </div>
            </nav>

            {/* Toast Notification */}
            {toastMessage && (
                <div className={`fixed bottom-20 sm:bottom-4 left-1/2 transform -translate-x-1/2 p-4 rounded-xl shadow-xl text-white font-semibold z-50 transition-opacity duration-300 ${toastMessage.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                    {toastMessage.message}
                </div>
            )}
        </div>
    );
};

export default App;
