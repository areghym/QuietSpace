import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    signInAnonymously,
    signInWithCustomToken,
    onAuthStateChanged,
} from 'firebase/auth';
import {
    getFirestore,
    doc,
    setDoc,
    onSnapshot,
    collection,
    setLogLevel,
} from 'firebase/firestore';

// --- Global Variables (Provided by Canvas Environment) ---
// We must check if these variables exist before using them.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// The main component: App
const App = () => {
    // 1. Firebase State
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [loading, setLoading] = useState(true);

    // 2. Application Data State (Example data structure)
    const [appData, setAppData] = useState({ message: 'Hello World', counter: 0 });
    const [inputMessage, setInputMessage] = useState('');
    const [error, setError] = useState(null);

    // Firestore Path Constants
    const PRIVATE_COLLECTION_NAME = 'app_state'; // Collection for user-specific data
    const DOCUMENT_ID = 'status_document';

    // Helper to construct the private document path
    const getDocRef = useCallback(() => {
        if (!db || !userId) return null;
        // Path: /artifacts/{appId}/users/{userId}/app_state/status_document
        const userStateCollection = collection(db, 'artifacts', appId, 'users', userId, PRIVATE_COLLECTION_NAME);
        return doc(userStateCollection, DOCUMENT_ID);
    }, [db, userId]);

    // --- EFFECT 1: Initialize Firebase and Handle Authentication ---
    useEffect(() => {
        try {
            // Set Firestore logging to debug mode
            setLogLevel('Debug');

            const firebaseApp = initializeApp(firebaseConfig);
            const firestoreDb = getFirestore(firebaseApp);
            const firebaseAuth = getAuth(firebaseApp);

            setDb(firestoreDb);
            setAuth(firebaseAuth);

            // Authentication Listener
            const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
                if (user) {
                    // User is signed in
                    setUserId(user.uid);
                    setIsAuthReady(true);
                    setLoading(false);
                } else {
                    // User is signed out, try to sign in with the custom token or anonymously
                    try {
                        if (initialAuthToken) {
                            await signInWithCustomToken(firebaseAuth, initialAuthToken);
                        } else {
                            // Fallback to anonymous sign-in if no custom token is available
                            await signInAnonymously(firebaseAuth);
                        }
                    } catch (authError) {
                        setError('Authentication failed. Check your console for details.');
                        console.error('Firebase Auth Error:', authError);
                        // Still set ready, but userId might be null or transient
                        setIsAuthReady(true);
                        setLoading(false);
                    }
                }
            });

            // Cleanup subscription on component unmount
            return () => unsubscribe();

        } catch (initError) {
            setError('Failed to initialize Firebase. Ensure config is correct.');
            console.error('Firebase Init Error:', initError);
            setLoading(false);
        }
    }, []); // Run once on mount

    // --- EFFECT 2: Set up Real-time Data Listener (onSnapshot) ---
    useEffect(() => {
        // Only proceed if DB is ready, auth is ready, and we have a userId
        if (!db || !isAuthReady || !userId) return;

        const docRef = getDocRef();
        if (!docRef) return;

        let unsubscribeSnapshot = () => {};

        try {
            // Set up real-time listener
            unsubscribeSnapshot = onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    // Data exists, update state
                    const data = docSnap.data();
                    console.log('Real-time data received:', data);
                    setAppData(data);
                } else {
                    // Document doesn't exist yet, initialize it
                    console.log('Document not found. Setting initial data.');
                    setDoc(docRef, appData)
                        .catch(e => console.error('Error setting initial document:', e));
                }
                setLoading(false);
            }, (snapshotError) => {
                setError('Error fetching real-time data.');
                console.error('Firestore Snapshot Error:', snapshotError);
                setLoading(false);
            });
        } catch (e) {
            console.error("Failed to attach snapshot listener:", e);
        }

        // Cleanup subscription on db/userId change or unmount
        return () => unsubscribeSnapshot();
    }, [db, userId, isAuthReady, getDocRef]);

    // --- WRITE LOGIC: Update Document ---
    const handleSaveMessage = async () => {
        if (!db || !userId) {
            setError("Database not connected or user not authenticated.");
            return;
        }
        if (!inputMessage.trim()) return;

        const docRef = getDocRef();
        if (!docRef) return;

        try {
            // Update only the message field, keeping the counter
            await setDoc(docRef, { message: inputMessage }, { merge: true });
            setInputMessage(''); // Clear input
            console.log("Message successfully written!");
        } catch (e) {
            setError('Failed to save data.');
            console.error('Firestore Write Error:', e);
        }
    };

    // --- WRITE LOGIC: Increment Counter ---
    const handleIncrement = async () => {
        if (!db || !userId) {
            setError("Database not connected or user not authenticated.");
            return;
        }

        const docRef = getDocRef();
        if (!docRef) return;

        try {
            // Increment the counter based on the current appData state
            const newCounter = appData.counter + 1;
            await setDoc(docRef, { counter: newCounter }, { merge: true });
            console.log("Counter successfully incremented!");
        } catch (e) {
            setError('Failed to update counter.');
            console.error('Firestore Increment Error:', e);
        }
    };

    const StatusIndicator = ({ status, className = '' }) => (
        <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium ${className}`}>
            <svg className="-ml-1 mr-1.5 h-2 w-2" fill="currentColor" viewBox="0 0 8 8">
                <circle cx="4" cy="4" r="3" />
            </svg>
            {status}
        </span>
    );

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-inter">
            <script src="https://cdn.tailwindcss.com"></script>
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-extrabold text-gray-900 mb-6">
                    Firestore Real-time Database Demo
                </h1>
                <p className="text-gray-600 mb-8">
                    This app demonstrates connecting to and syncing data with Firestore using the private path:
                    <br/>
                    <code className="bg-gray-200 text-sm p-1 rounded-md text-red-600">
                        /artifacts/{appId}/users/&lt;userId&gt;/app_state/status_document
                    </code>
                </p>

                {/* Status Section */}
                <div className="bg-white shadow-xl rounded-xl p-6 mb-8 border border-gray-200">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Connection Status</h2>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">Database Status:</span>
                            {db ? (
                                <StatusIndicator status="Connected" className="bg-green-100 text-green-800" />
                            ) : (
                                <StatusIndicator status="Initializing..." className="bg-yellow-100 text-yellow-800" />
                            )}
                        </div>
                        <div className="flex items-start justify-between">
                            <span className="text-gray-600">Current User ID:</span>
                            <code className="text-sm font-mono break-all text-blue-600 bg-blue-50 p-1 rounded-md max-w-xs sm:max-w-md">
                                {userId || 'Authenticating...'}
                            </code>
                        </div>
                        {error && (
                            <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium">
                                Error: {error}
                            </div>
                        )}
                    </div>
                </div>

                {/* Real-time Data Display */}
                <div className="bg-white shadow-xl rounded-xl p-6 border border-gray-200">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Real-time Data</h2>
                    {loading ? (
                        <div className="text-lg text-gray-500 py-4 flex items-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Loading data from Firestore...
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                                <p className="text-sm font-medium text-purple-700">Database Message:</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{appData.message}</p>
                            </div>
                            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200 flex items-center justify-between">
                                <p className="text-sm font-medium text-indigo-700">Database Counter:</p>
                                <span className="text-4xl font-extrabold text-indigo-600">{appData.counter}</span>
                            </div>
                        </div>
                    )}

                    {/* Write Operations */}
                    <div className="mt-8 pt-6 border-t border-gray-200 space-y-4">
                        <h3 className="text-xl font-medium text-gray-800">Update Data</h3>

                        {/* Message Update */}
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input
                                type="text"
                                className="flex-grow p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                placeholder="Enter new message to save..."
                                disabled={!userId || loading}
                            />
                            <button
                                onClick={handleSaveMessage}
                                disabled={!userId || loading || !inputMessage.trim()}
                                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-150 disabled:opacity-50"
                            >
                                Save Message
                            </button>
                        </div>

                        {/* Counter Increment */}
                        <button
                            onClick={handleIncrement}
                            disabled={!userId || loading}
                            className="w-full px-6 py-3 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition duration-150 disabled:opacity-50"
                        >
                            Increment Counter (Current: {appData.counter})
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;
